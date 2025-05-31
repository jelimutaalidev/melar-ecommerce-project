// frontend/src/pages/ShopCreationPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Upload, Info, CheckCircle, AlertTriangle, MapPin, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient'; // Pastikan path ini benar
import type { Shop } from '../types'; // Pastikan tipe Shop diimport

interface CategoryOption {
  id: string; // ID dari backend (biasanya integer, tapi kita simpan sebagai string)
  name: string;
}

const ShopCreationPage: React.FC = () => {
  const { user, isAuthenticated, updateUserHasShop, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    shopName: '',
    description: '',
    phoneNumber: '',
    address: '',
    city: '',
    state: '',
    zip: '', // Akan menjadi zip_code untuk backend
    logo: null as File | null,
    businessType: '', // Akan menjadi business_type untuk backend
    category_ids: [] as string[], // Menyimpan ID kategori yang dipilih
    termsAgreed: false
  });

  const [availableCategories, setAvailableCategories] = useState<CategoryOption[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);

  // --- useEffect untuk mengambil daftar kategori dari backend ---
  useEffect(() => {
    const fetchCategories = async () => {
      console.log("[ShopCreationPage] Attempting to fetch categories from API.");
      setIsLoadingCategories(true);
      try {
        const categoriesFromApi: any[] = await apiClient.get('/categories/');
        if (Array.isArray(categoriesFromApi)) {
            const formattedCategories = categoriesFromApi.map(cat => ({
                id: String(cat.id), // Pastikan ID adalah string
                name: cat.name
            }));
            setAvailableCategories(formattedCategories);
            console.log("[ShopCreationPage] Categories fetched and set:", formattedCategories);
        } else {
            console.error("[ShopCreationPage] Categories API did not return an array:", categoriesFromApi);
            setError("Failed to load categories: Invalid data format from server.");
        }
      } catch (catError: any) {
        console.error("[ShopCreationPage] Failed to fetch categories:", catError);
        setError(`Failed to load categories: ${catError.message || "Unknown error"}`);
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []); // Hanya dijalankan sekali saat komponen dimuat

  // --- useEffect untuk autentikasi dan redirect ---
  useEffect(() => {
    console.log("[ShopCreationPage] Auth check effect: authLoading", authLoading, "isAuthenticated", isAuthenticated, "user?.hasShop", user?.hasShop);
    if (!authLoading) {
      if (!isAuthenticated) {
        console.log("[ShopCreationPage] User not authenticated, redirecting to login.");
        navigate('/login', { state: { returnTo: '/create-shop' } });
      } else if (user?.hasShop === true) { // Periksa secara eksplisit user.hasShop === true
        console.log("[ShopCreationPage] User already has a shop, redirecting to dashboard.");
        // Nonaktifkan alert agar tidak mengganggu alur otomatis jika user sudah punya toko
        // alert("You already own a shop. Redirecting to your dashboard."); 
        navigate('/shop-dashboard');
      } else {
        console.log("[ShopCreationPage] User authenticated and does not have a shop. Proceed.");
      }
    } else {
        console.log("[ShopCreationPage] Auth context is loading...");
    }
  }, [isAuthenticated, user, user?.hasShop, authLoading, navigate]); // Tambahkan user?.hasShop sebagai dependensi
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log(`[ShopCreationPage] InputChange: name=${name}, value=${value}`);
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null); // Hapus error jika user mulai menginput
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked, value } = e.target; 
    console.log(`[ShopCreationPage] CheckboxChange: name=${name}, value=${value}, checked=${checked}`);
    
    if (name === 'termsAgreed') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'category') {
      const categoryId = value; // value dari checkbox adalah ID kategori
      setFormData(prev => {
        const new_category_ids = checked
          ? [...prev.category_ids, categoryId]
          : prev.category_ids.filter(id => id !== categoryId);
        console.log("[ShopCreationPage] Updated category_ids in state:", new_category_ids);
        return { ...prev, category_ids: new_category_ids };
      });
    }
    if (error) setError(null);
  };
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log("[ShopCreationPage] LogoChange: file selected", file.name);
      setFormData(prev => ({ ...prev, logo: file }));
    }
  };
  
  const validateStep = (currentStep: number): boolean => {
    console.log(`[ShopCreationPage] Validating step: ${currentStep} with formData:`, formData);
    let isValid = true;
    let stepError: string | null = null;

    if (currentStep >= 1 && (!formData.shopName.trim() || !formData.description.trim())) {
      stepError = 'Shop Name and Description are required.'; isValid = false;
    }
    if (currentStep >= 2 && (!formData.address.trim() || !formData.city.trim() || !formData.state.trim() || !formData.zip.trim())) {
      stepError = 'All address fields (Street, City, State, ZIP) are required.'; isValid = false;
    }
    if (currentStep >= 3 && (!formData.businessType || formData.category_ids.length === 0)) {
      stepError = 'Business Type and at least one Category are required.'; isValid = false;
    }
    if (currentStep === 4 && !formData.termsAgreed) { // Validasi terms khusus saat submit di step 4
        stepError = 'You must agree to the terms and conditions.'; isValid = false;
    }

    if (!isValid && stepError) {
        console.warn(`[ShopCreationPage] Validation failed for step ${currentStep}: ${stepError}`);
        setError(stepError);
    } else if (isValid && error === stepError) { // Hanya hapus error yang relevan dengan step ini jika sudah valid
        setError(null);
    } else if (isValid && currentStep === 4 && error) { // Jika semua valid di step 4, hapus semua error
        setError(null);
    }
    return isValid;
  };

  const nextStep = () => { 
    if (validateStep(step)) { // Validasi step saat ini sebelum lanjut
        setStep(prev => prev + 1); 
        window.scrollTo(0,0); 
    }
  };
  const prevStep = () => { 
    setError(null); // Hapus error saat kembali ke step sebelumnya
    setStep(prev => prev - 1); 
    window.scrollTo(0,0); 
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[ShopCreationPage] handleSubmit triggered.");
    setError(null); // Reset error sebelum submit

    if (!validateStep(4)) { // Validasi semua field yang relevan di semua step, termasuk termsAgreed
        console.error("[ShopCreationPage] Final validation before submit failed. Error state:", error);
        // Error sudah di-set oleh validateStep jika ada
        return;
    }
    if (!user || !user.id) {
      const authErrorMessage = "User not authenticated or user data is missing. Please log in again.";
      console.error(`[ShopCreationPage] Pre-submit check failed: ${authErrorMessage}`);
      setError(authErrorMessage); 
      setIsSubmitting(false); // Pastikan diset jika ada return awal
      return;
    }
    
    setIsSubmitting(true);
    console.log("[ShopCreationPage] Current formData state before creating FormData object:", JSON.stringify(formData, null, 2));
    
    const submissionData = new FormData();
    submissionData.append('name', formData.shopName.trim());
    submissionData.append('description', formData.description.trim());
    submissionData.append('location', `${formData.city.trim()}, ${formData.state.trim()}`); 
    submissionData.append('address', formData.address.trim());
    submissionData.append('zip_code', formData.zip.trim()); // Sesuai model backend

    if (formData.phoneNumber.trim()) {
        submissionData.append('phone_number', formData.phoneNumber.trim()); // Sesuai model backend
    }
    if (formData.businessType) {
        submissionData.append('business_type', formData.businessType); // Sesuai model backend
    }
    
    if (formData.logo) {
      submissionData.append('image', formData.logo, formData.logo.name); // 'image' adalah field di backend
    }
    
    console.log("[ShopCreationPage] Appending category_ids from state:", formData.category_ids);
    formData.category_ids.forEach(catId => { 
      submissionData.append('category_ids', catId); // catId HARUS berupa ID kategori (string numerik)
    });

    console.log("[ShopCreationPage] --- FormData entries to be submitted: ---");
    for (let pair of submissionData.entries()) {
        if (pair[1] instanceof File) {
            console.log(`${pair[0]}: File(name=${(pair[1] as File).name}, type=${(pair[1] as File).type}, size=${(pair[1] as File).size})`);
        } else {
            console.log(`${pair[0]}: "${pair[1]}"`); 
        }
    }
    console.log("[ShopCreationPage] --- End of FormData entries ---");

    try {
      console.log("[ShopCreationPage] Attempting to POST to /shops/ via apiClient.");
      const newShopDataFromApi: Shop = await apiClient.post('/shops/', submissionData);
      console.log("[ShopCreationPage] API call successful. Response from backend:", newShopDataFromApi);

      if (newShopDataFromApi && newShopDataFromApi.id) {
        console.log(`[ShopCreationPage] Shop created with ID: ${newShopDataFromApi.id}. Updating AuthContext.`);
        updateUserHasShop(true, String(newShopDataFromApi.id)); // Pastikan shopId adalah string
        setIsSubmitting(false);
        alert('Shop created successfully!');
        console.log("[ShopCreationPage] Navigating to /shop-dashboard with refreshShopData state.");
        // PENTING: Kirim state untuk memicu refresh di dashboard
        navigate('/shop-dashboard', { state: { refreshShopData: true, tab: 'products' } }); 
      } else {
        const invalidResponseError = "Shop creation response was invalid or missing shop ID from API.";
        console.error(`[ShopCreationPage] Error after successful API call: ${invalidResponseError}`, newShopDataFromApi);
        throw new Error(invalidResponseError);
      }
    } catch (err: any) {
      console.error("[ShopCreationPage] Shop creation API call FAILED. Error object:", err);
      let errorMessage = 'Failed to create shop. Please try again.';
      if (err.response && err.response.data && typeof err.response.data === 'object') {
        const backendErrors = err.response.data;
        console.error("[ShopCreationPage] Backend error details:", backendErrors);
        errorMessage = Object.entries(backendErrors)
            .map(([field, messages]) => `${field}: ${(Array.isArray(messages) ? messages.join(', ') : messages)}`)
            .join(' \n'); // Gunakan newline agar pesan error dari backend lebih mudah dibaca jika ada beberapa
      } else if (err.message) {
        errorMessage = err.message;
      }
      console.error(`[ShopCreationPage] Setting error state: ${errorMessage}`);
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };
  
  if (authLoading) {
    return <div className="container-custom py-10 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto" /> Loading user data...</div>;
  }
  
  // JSX untuk form (Struktur sama seperti kode Anda sebelumnya, dengan penyesuaian kecil untuk loading kategori)
  return (
    <div className="bg-gray-50 min-h-screen pb-16 fade-in">
      <div className="bg-primary-700 text-white py-10">
        <div className="container-custom">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Create Your Shop</h1>
          <p className="text-primary-100">Start renting your items and earning money</p>
        </div>
      </div>

      <div className="container-custom py-8">
        {/* Progress Bar Steps (sama seperti kode Anda) */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center text-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}> <Store className="h-5 w-5" /> </div>
              <span className={`text-xs sm:text-sm ${step >= 1 ? 'text-primary-600 font-medium' : 'text-gray-500'}`}>Shop Details</span>
            </div>
            <div className={`flex-1 h-1 mx-1 sm:mx-2 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
            <div className="flex flex-col items-center text-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}> <MapPin className="h-5 w-5" /> </div>
              <span className={`text-xs sm:text-sm ${step >= 2 ? 'text-primary-600 font-medium' : 'text-gray-500'}`}>Location</span>
            </div>
            <div className={`flex-1 h-1 mx-1 sm:mx-2 ${step >= 3 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
            <div className="flex flex-col items-center text-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${step >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}> <Info className="h-5 w-5" /> </div>
              <span className={`text-xs sm:text-sm ${step >= 3 ? 'text-primary-600 font-medium' : 'text-gray-500'}`}>Business Info</span>
            </div>
            <div className={`flex-1 h-1 mx-1 sm:mx-2 ${step >= 4 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
            <div className="flex flex-col items-center text-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${step >= 4 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}> <CheckCircle className="h-5 w-5" /> </div>
              <span className={`text-xs sm:text-sm ${step >= 4 ? 'text-primary-600 font-medium' : 'text-gray-500'}`}>Review</span>
            </div>
          </div>
        </div>
        
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-lg">
              {step === 1 && 'Shop Details'}
              {step === 2 && 'Location Information'}
              {step === 3 && 'Business Information'}
              {step === 4 && 'Review Your Shop'}
            </h2>
          </div>
          
          {error && (
            <div className="m-6 p-4 bg-red-100 text-red-700 border border-red-300 rounded-md flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
                <p className="whitespace-pre-wrap">{error}</p> {/* Memastikan pesan error bisa multi-baris */}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Shop Details (menggunakan kode Anda sebelumnya) */}
            {step === 1 && (
              <div className="p-6">
                <div className="space-y-6">
                  <div>
                    <label htmlFor="shopName" className="block text-sm font-medium text-gray-700 mb-1">Shop Name <span className="text-red-500">*</span></label>
                    <input id="shopName" type="text" name="shopName" value={formData.shopName} onChange={handleInputChange} className="input w-full" />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                    <textarea id="description" name="description" value={formData.description} onChange={handleInputChange} rows={4} className="input w-full" placeholder="Describe your shop and what items you plan to rent out"/>
                  </div>
                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input id="phoneNumber" type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} className="input w-full"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shop Logo</label>
                    <div className="mt-1 flex items-center">
                      <div className="w-24 h-24 border border-gray-300 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                        {formData.logo ? (<img src={URL.createObjectURL(formData.logo)} alt="Shop logo preview" className="w-full h-full object-cover"/>) : (<Store className="h-12 w-12 text-gray-400" />)}
                      </div>
                      <label htmlFor="logoUpload" className="cursor-pointer ml-5 bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50">
                        <span>Upload Logo</span>
                        <input id="logoUpload" type="file" name="logo" onChange={handleLogoChange} accept="image/*" className="sr-only" />
                      </label>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Recommended size: 500x500px. Max file size: 2MB</p>
                  </div>
                </div>
                <div className="mt-8 flex justify-end">
                  <button type="button" onClick={nextStep} className="btn-primary">Continue</button>
                </div>
              </div>
            )}
            
            {/* Step 2: Location Information (menggunakan kode Anda sebelumnya) */}
            {step === 2 && (
              <div className="p-6">
                <div className="space-y-6">
                  <div><label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Street Address <span className="text-red-500">*</span></label><input id="address" type="text" name="address" value={formData.address} onChange={handleInputChange} className="input w-full"/></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City <span className="text-red-500">*</span></label><input id="city" type="text" name="city" value={formData.city} onChange={handleInputChange} className="input w-full"/></div>
                    <div><label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">State <span className="text-red-500">*</span></label><input id="state" type="text" name="state" value={formData.state} onChange={handleInputChange} className="input w-full"/></div>
                    <div><label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">ZIP Code <span className="text-red-500">*</span></label><input id="zip" type="text" name="zip" value={formData.zip} onChange={handleInputChange} className="input w-full"/></div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                     <div className="flex"> <div className="flex-shrink-0"> <Info className="h-5 w-5 text-blue-400" /> </div> <div className="ml-3"> <h3 className="text-sm font-medium text-blue-800">Location Privacy</h3> <div className="mt-2 text-sm text-blue-700"> <p> Your exact address will not be displayed to customers. Only the city and state will be shown publicly. </p> </div> </div> </div>
                  </div>
                </div>
                <div className="mt-8 flex justify-between">
                  <button type="button" onClick={prevStep} className="btn-secondary">Back</button>
                  <button type="button" onClick={nextStep} className="btn-primary">Continue</button>
                </div>
              </div>
            )}
            
            {/* Step 3: Business Information (dengan kategori dari API) */}
            {step === 3 && (
              <div className="p-6">
                <div className="space-y-6">
                    <div>
                        <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-1">Business Type <span className="text-red-500">*</span></label>
                        <select id="businessType" name="businessType" value={formData.businessType} onChange={handleInputChange} className="input w-full">
                            <option value="">Select business type</option>
                            <option value="individual">Individual</option>
                            <option value="registered_business">Registered Business</option>
                            <option value="non_profit">Non-Profit</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Item Categories <span className="text-red-500">*</span></label>
                        <p className="text-sm text-gray-500 mb-3">Select categories that best describe the items you plan to rent out</p>
                        {isLoadingCategories ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                                <span className="ml-2 text-gray-500">Loading categories...</span>
                            </div>
                        ) : availableCategories.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {availableCategories.map(category => ( // Menggunakan availableCategories dari state
                                <label key={category.id} className="flex items-center">
                                <input type="checkbox" name="category" 
                                       value={category.id} // VALUE ADALAH ID KATEGORI
                                       checked={formData.category_ids.includes(category.id)}
                                       onChange={handleCheckboxChange}
                                       className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"/>
                                <span className="ml-2 text-sm text-gray-700">{category.name}</span>
                                </label>
                            ))}
                            </div>
                        ) : (
                            // Menampilkan error jika ada, atau pesan default jika tidak ada kategori
                            <p className="text-sm text-red-500">{error && error.includes("categories") ? error : "No categories available. Please add categories in the admin panel or try refreshing."}</p>
                        )}
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <div className="flex"> <div className="flex-shrink-0"> <AlertTriangle className="h-5 w-5 text-yellow-400" /> </div> <div className="ml-3"> <h3 className="text-sm font-medium text-yellow-800">Important Note</h3> <div className="mt-2 text-sm text-yellow-700"> <p> You're responsible for ensuring all items you rent comply with local laws and regulations, including safety standards. </p> </div> </div> </div>
                    </div>
                </div>
                <div className="mt-8 flex justify-between">
                  <button type="button" onClick={prevStep} className="btn-secondary">Back</button>
                  <button type="button" onClick={nextStep} className="btn-primary">Continue</button>
                </div>
              </div>
            )}
            
            {/* Step 4: Review Your Shop (menggunakan kode Anda sebelumnya) */}
            {step === 4 && (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="font-medium text-lg mb-4">Review Your Shop Details</h3>
                  <div className="space-y-4 text-sm text-gray-800">
                    <p><strong>Shop Name:</strong> {formData.shopName || '(Not provided)'}</p>
                    <p><strong>Description:</strong> {formData.description || '(Not provided)'}</p>
                    <p><strong>Phone:</strong> {formData.phoneNumber || 'N/A'}</p>
                    <p><strong>Address:</strong> {`${formData.address || ''}, ${formData.city || ''}, ${formData.state || ''} ${formData.zip || ''}`.replace(/, ,|^, | ,$/g, '') || '(Not provided)'}</p>
                    <p><strong>Business Type:</strong> {formData.businessType || '(Not selected)'}</p>
                    <p><strong>Categories:</strong> {formData.category_ids.map(id => availableCategories.find(c=>c.id === id)?.name || id).join(', ') || '(None selected)'}</p>
                    {formData.logo && <p><strong>Logo:</strong> {formData.logo.name}</p>}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-md mb-6">
                  <label className="flex items-center">
                    <input type="checkbox" name="termsAgreed" checked={formData.termsAgreed} onChange={handleCheckboxChange} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"/>
                    <span className="ml-2 text-sm text-gray-700">I agree to Melar's <a href="#" className="text-primary-600 hover:underline">Terms of Service</a> and <a href="#" className="text-primary-600 hover:underline">Rental Policies</a></span>
                  </label>
                </div>
                <div className="flex justify-between">
                  <button type="button" onClick={prevStep} className="btn-secondary">Back</button>
                  <button type="submit" disabled={isSubmitting || !formData.termsAgreed} className={`btn-primary ${isSubmitting || !formData.termsAgreed ? 'opacity-70 cursor-not-allowed' : ''}`}>
                    {isSubmitting ? (<><Upload className="animate-spin h-4 w-4 mr-2 inline-block"/>Creating Shop...</>) : 'Create Shop'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ShopCreationPage;