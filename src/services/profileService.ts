import { BusinessSettings } from '../types';
import { storageService, DEFAULT_SETTINGS } from './storage';
import { cloudService } from './cloudService';

export interface UserProfile {
  companyName: string;
  ownerName: string;
  email: string;
  phone: string;
  whatsappNumber?: string;
  address: string;
  website?: string;
  logoUrl?: string;
  taxId?: string;
  bankDetails?: string;
  currency: string;
  currencySymbol: string;
  invoiceNotesTemplate?: string;
  updatedAt?: string;
}

const PROFILE_STORAGE_KEY = 'biztrack_user_profile_v1';

class ProfileService {
  public getProfile(): UserProfile {
    if (typeof localStorage === 'undefined') {
      return this.fromSettings(DEFAULT_SETTINGS);
    }

    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to parse cached profile:', e);
    }

    // Default to app settings
    const settings = storageService.getSettings();
    const profile = this.fromSettings(settings);
    this.saveProfile(profile);
    return profile;
  }

  public saveProfile(profile: Partial<UserProfile>): UserProfile {
    const current = this.getProfile();
    const updated: UserProfile = {
      ...current,
      ...profile,
      updatedAt: new Date().toISOString(),
    };

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save profile:', e);
      }
    }

    // Also sync to settings in storageService so the entire app reflects the changes
    storageService.saveSettings({
      businessName: updated.companyName,
      ownerName: updated.ownerName,
      email: updated.email,
      phone: updated.phone,
      whatsappNumber: updated.whatsappNumber || updated.phone,
      address: updated.address,
      website: updated.website || '',
      taxId: updated.taxId || '',
      bankDetails: updated.bankDetails || '',
      defaultCurrency: updated.currency as any || 'USD',
      currencySymbol: updated.currencySymbol || '$',
      invoiceNotesTemplate: updated.invoiceNotesTemplate || '',
    });

    // Sync to Cloud
    cloudService.saveDocument('profiles', 'main_profile', updated);

    return updated;
  }

  private fromSettings(s: BusinessSettings): UserProfile {
    return {
      companyName: s.businessName || 'My Workspace Studio',
      ownerName: s.ownerName || 'Workspace Owner',
      email: s.email || 'contact@myworkspace.io',
      phone: s.phone || '',
      whatsappNumber: s.whatsappNumber || s.phone || '',
      address: s.address || '',
      website: s.website || '',
      logoUrl: '',
      taxId: s.taxId || '',
      bankDetails: s.bankDetails || '',
      currency: s.defaultCurrency || 'USD',
      currencySymbol: s.currencySymbol || '$',
      invoiceNotesTemplate: s.invoiceNotesTemplate || '',
    };
  }
}

export const profileService = new ProfileService();
