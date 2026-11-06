import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { profileService, UserProfile } from '../../services/profileService';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Image, 
  Save, 
  Sparkles,
  CheckCircle2,
  FileText
} from 'lucide-react';

export const ProfileSettings: React.FC = () => {
  const { settings, updateSettings, showToast } = useApp();
  const [profile, setProfile] = useState<UserProfile>(profileService.getProfile());
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Keep in sync with current settings
    setProfile(profileService.getProfile());
  }, [settings]);

  const handleChange = (field: keyof UserProfile, value: string) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsSaved(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        showToast('Logo image must be under 1.5 MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        handleChange('logoUrl', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = profileService.saveProfile(profile);
    setProfile(updated);

    // Sync to AppContext state
    await updateSettings({
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
    });

    setIsSaved(true);
    showToast('Company profile saved! Updated on invoices and dashboard.');
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#0D9488]" />
            <span>Company Profile & Branding</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure your official company identity, contacts, address, and logo. All invoices dynamically pull this information.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Edit Form (Span 2) */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Business & Owner Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company / Business Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Engineering Solutions"
                    value={profile.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Owner / Contact Person *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Johnathan Smith"
                    value={profile.ownerName}
                    onChange={(e) => handleChange('ownerName', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488]"
                  />
                </div>
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Billing Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="billing@yourcompany.com"
                    value={profile.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business Phone / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="+1 (555) 019-2834"
                    value={profile.phone}
                    onChange={(e) => {
                      handleChange('phone', e.target.value);
                      handleChange('whatsappNumber', e.target.value);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488]"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Physical / Headquarters Address
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <textarea
                  rows={2}
                  placeholder="Suite 400, 100 Tech Boulevard, San Francisco, CA 94107"
                  value={profile.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488]"
                />
              </div>
            </div>

            {/* Website & Tax ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Website URL
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="https://yourcompany.com"
                    value={profile.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tax / VAT Registration ID
                </label>
                <input
                  type="text"
                  placeholder="US-EIN-928301 or VAT ID"
                  value={profile.taxId}
                  onChange={(e) => handleChange('taxId', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488] font-mono"
                />
              </div>
            </div>

            {/* Company Logo Upload / URL */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company Brand Logo
              </label>
              <div className="flex items-center gap-4">
                {profile.logoUrl ? (
                  <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-white p-1 shrink-0 flex items-center justify-center">
                    <img src={profile.logoUrl} alt="Company Logo" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                    <Image className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                  <p className="text-[11px] text-slate-400">PNG, JPG, or SVG up to 1.5MB. Rendered directly on invoice header.</p>
                </div>
              </div>
            </div>

            {/* Bank details */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Remittance & Payment Instructions (Printed on Invoices)
              </label>
              <textarea
                rows={3}
                placeholder="Bank Name: Chase Bank&#10;Account Name: Acme Corp&#10;Routing: 123456789 | Account: 987654321&#10;Swift / BIC: CHASEUS33"
                value={profile.bankDetails}
                onChange={(e) => handleChange('bankDetails', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488] font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              {isSaved && (
                <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Changes Saved</span>
                </span>
              )}
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Invoice Preview Card (Span 1) */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <FileText className="w-4 h-4 text-[#0D9488]" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Live Invoice Header Preview
              </h3>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  {profile.logoUrl ? (
                    <img src={profile.logoUrl} alt="Logo" className="h-9 object-contain mb-2" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-[#142B4A] text-white flex items-center justify-center font-bold text-sm mb-2">
                      {profile.companyName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <h4 className="font-bold text-slate-900 text-sm">{profile.companyName || 'Your Business Name'}</h4>
                  <p className="text-[11px] text-slate-500">{profile.ownerName}</p>
                  <p className="text-[11px] text-slate-500">{profile.email}</p>
                  {profile.phone && <p className="text-[11px] text-slate-500">{profile.phone}</p>}
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold tracking-tight text-slate-900 block">INVOICE</span>
                  <span className="font-mono text-xs text-slate-500">#INV-2026-001</span>
                </div>
              </div>

              {profile.address && (
                <div className="text-[11px] text-slate-500 border-t border-slate-200 pt-2">
                  <span className="font-semibold text-slate-700 block">Headquarters:</span>
                  <p className="whitespace-pre-line">{profile.address}</p>
                </div>
              )}

              {profile.taxId && (
                <div className="text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Tax ID: </span>
                  <span className="font-mono">{profile.taxId}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-[11px] flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-[#0D9488]" />
            <span>Updates saved here will automatically sync to all existing and new invoices.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
