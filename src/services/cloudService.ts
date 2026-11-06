import { db, isFirebaseConfigured } from '../config/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot,
  writeBatch
} from 'firebase/firestore';

export interface SyncQueueItem {
  id: string;
  collectionName: string;
  docId: string;
  data: any;
  action: 'set' | 'delete';
  timestamp: string;
}

const OFFLINE_SYNC_QUEUE_KEY = 'biztrack_offline_sync_queue_v1';
const CLOUD_SYNC_STATUS_KEY = 'biztrack_cloud_sync_status';

class CloudService {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private syncListeners: ((status: 'synced' | 'syncing' | 'offline' | 'error') => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notifyStatus('syncing');
        this.flushOfflineQueue();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyStatus('offline');
      });
    }
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public onSyncStatusChange(cb: (status: 'synced' | 'syncing' | 'offline' | 'error') => void): () => void {
    this.syncListeners.push(cb);
    cb(this.isOnline ? 'synced' : 'offline');
    return () => {
      this.syncListeners = this.syncListeners.filter((listener) => listener !== cb);
    };
  }

  private notifyStatus(status: 'synced' | 'syncing' | 'offline' | 'error') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CLOUD_SYNC_STATUS_KEY, status);
    }
    this.syncListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.error('Error in sync status listener:', err);
      }
    });
  }

  // Save document to Cloud with offline queuing fallback
  public async saveDocument(collectionName: string, docId: string, data: any): Promise<void> {
    const serializedData = {
      ...data,
      syncedAt: new Date().toISOString(),
      isCloudSynced: true,
    };

    if (!this.isOnline || !isFirebaseConfigured || !db) {
      this.enqueueOfflineMutation({
        id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        collectionName,
        docId,
        data: serializedData,
        action: 'set',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      this.notifyStatus('syncing');
      const docRef = doc(db, collectionName, docId);
      await setDoc(docRef, serializedData, { merge: true });
      this.notifyStatus('synced');
    } catch (error) {
      console.warn(`[CloudService] Error saving ${collectionName}/${docId} to cloud, queued for later:`, error);
      this.enqueueOfflineMutation({
        id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        collectionName,
        docId,
        data: serializedData,
        action: 'set',
        timestamp: new Date().toISOString(),
      });
      this.notifyStatus('offline');
    }
  }

  // Get single document from Cloud
  public async getDocument<T = any>(collectionName: string, docId: string): Promise<T | null> {
    if (!this.isOnline || !isFirebaseConfigured || !db) {
      return null;
    }

    try {
      const docRef = doc(db, collectionName, docId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return snapshot.data() as T;
      }
      return null;
    } catch (error) {
      console.warn(`[CloudService] Error fetching ${collectionName}/${docId}:`, error);
      return null;
    }
  }

  // Query documents for a specific user / business
  public async getUserDocuments<T = any>(collectionName: string, userId: string): Promise<T[]> {
    if (!this.isOnline || !isFirebaseConfigured || !db) {
      return [];
    }

    try {
      const colRef = collection(db, collectionName);
      const q = query(colRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const results: T[] = [];
      querySnapshot.forEach((docSnap) => {
        results.push(docSnap.data() as T);
      });
      return results;
    } catch (error) {
      console.warn(`[CloudService] Error querying ${collectionName} for user ${userId}:`, error);
      return [];
    }
  }

  // Real-time listener for user documents
  public subscribeToUserCollection<T = any>(
    collectionName: string, 
    userId: string, 
    onUpdate: (data: T[]) => void
  ): () => void {
    if (!isFirebaseConfigured || !db) {
      return () => {};
    }

    try {
      const colRef = collection(db, collectionName);
      const q = query(colRef, where('userId', '==', userId));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items: T[] = [];
          snapshot.forEach((docSnap) => {
            items.push(docSnap.data() as T);
          });
          onUpdate(items);
          this.notifyStatus('synced');
        },
        (error) => {
          console.warn(`[CloudService] Realtime sync error on ${collectionName}:`, error);
          this.notifyStatus('error');
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn(`[CloudService] Failed to establish listener for ${collectionName}:`, err);
      return () => {};
    }
  }

  // Batch sync entire app state to Cloud for user
  public async syncFullStateToCloud(userId: string, dataBundle: Record<string, any[]>): Promise<boolean> {
    if (!this.isOnline || !isFirebaseConfigured || !db) {
      // Store in offline cache
      try {
        localStorage.setItem(`biztrack_cloud_backup_${userId}`, JSON.stringify({
          dataBundle,
          savedAt: new Date().toISOString()
        }));
      } catch (e) {
        console.warn('Could not store offline backup:', e);
      }
      return false;
    }

    try {
      this.notifyStatus('syncing');
      const batch = writeBatch(db);

      // Save user workspace summary document
      const summaryRef = doc(db, 'workspaces', userId);
      batch.set(summaryRef, {
        userId,
        lastUpdated: new Date().toISOString(),
        clientCount: (dataBundle.clients || []).length,
        invoiceCount: (dataBundle.invoices || []).length,
        projectCount: (dataBundle.projects || []).length,
      }, { merge: true });

      // Save individual records in respective collections with userId
      for (const [colName, items] of Object.entries(dataBundle)) {
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item && item.id) {
              const itemRef = doc(db, colName, item.id);
              batch.set(itemRef, {
                ...item,
                userId,
                updatedAt: item.updatedAt || new Date().toISOString()
              }, { merge: true });
            }
          }
        }
      }

      await batch.commit();
      this.notifyStatus('synced');
      return true;
    } catch (error) {
      console.error('[CloudService] Failed to commit cloud batch sync:', error);
      this.notifyStatus('error');
      return false;
    }
  }

  // Offline queue operations
  private getOfflineQueue(): SyncQueueItem[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(OFFLINE_SYNC_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private setOfflineQueue(queue: SyncQueueItem[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(OFFLINE_SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.warn('Failed to persist offline sync queue:', err);
    }
  }

  private enqueueOfflineMutation(item: SyncQueueItem): void {
    const queue = this.getOfflineQueue();
    // Replace duplicate queue items for same doc
    const filtered = queue.filter(q => !(q.collectionName === item.collectionName && q.docId === item.docId));
    filtered.push(item);
    this.setOfflineQueue(filtered);
  }

  public async flushOfflineQueue(): Promise<number> {
    if (!this.isOnline || !isFirebaseConfigured || !db) {
      return 0;
    }

    const queue = this.getOfflineQueue();
    if (queue.length === 0) return 0;

    let processedCount = 0;
    const remainingQueue: SyncQueueItem[] = [];

    for (const item of queue) {
      try {
        const docRef = doc(db, item.collectionName, item.docId);
        if (item.action === 'set') {
          await setDoc(docRef, item.data, { merge: true });
        }
        processedCount++;
      } catch (err) {
        console.warn(`Failed to process queued sync for ${item.collectionName}/${item.docId}:`, err);
        remainingQueue.push(item);
      }
    }

    this.setOfflineQueue(remainingQueue);
    if (processedCount > 0) {
      this.notifyStatus('synced');
    }
    return processedCount;
  }
}

export const cloudService = new CloudService();
