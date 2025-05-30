import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Upload, Info, CheckCircle, AlertTriangle, MapPin } from 'lucide-react'; // Pastikan semua ikon ini digunakan
import { useAuth } from '../context/AuthContext';

const ShopCreationPage: React.FC = () => {
  const { user, isAuthenticated, updateUserHasShop } = useAuth(); // Ambil updateUserHasShop
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    shopName: '',
    description: '',
    phoneNumber: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    logo: null as File | null,
    businessType: '',
    categories: [] as string[],
    termsAgreed: false
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    
    if (name === 'termsAgreed') {
      setFormData({ ...formData, [name]: checked });
    } else {
      // Handle categories checkboxes
      const categoryValue = e.target.value;
      if (checked) {
        setFormData({ 
          ...formData, 
          categories: [...formData.categories, categoryValue] 
        });
      } else {
        setFormData({ 
          ...formData, 
          categories: formData.categories.filter(cat => cat !== categoryValue) 
        });
      }
    }
  };
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, logo: e.target.files[0] });
    }
  };
  
  const nextStep = () => {
    // Validasi sederhana per langkah
    if (step === 1 && (!formData.shopName || !formData.description)) {
      alert('Please fill in Shop Name and Description.');
      return;
    }
    if (step === 2 && (!formData.address || !formData.city || !formData.state || !formData.zip)) {
      alert('Please fill in all address fields.');
      return;
    }
    if (step === 3 && (!formData.businessType || formData.categories.length === 0)) {
      alert('Please select a business type and at least one category.');
      return;
    }
    setStep(step + 1);
    window.scrollTo(0, 0); // Agar scroll kembali ke atas saat pindah step
  };
  
  const prevStep = () => {
    setStep(step - 1);
    window.scrollTo(0, 0); // Agar scroll kembali ke atas saat pindah step
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.termsAgreed) {
      alert('Please agree to the terms and conditions');
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate API call & Data Saving
    setTimeout(() => {
      const newShopId = Date.now().toString(); // ID unik sederhana untuk simulasi
      const newShopData = {
        id: newShopId,
        name: formData.shopName,
        description: formData.description,
        location: `${formData.city}, ${formData.state}`,
        rating: 0, // Nilai default untuk simulasi
        totalRentals: 0, // Nilai default untuk simulasi
        // Simpan path ke gambar jika ada, atau URL placeholder.
        // URL.createObjectURL(formData.logo) hanya valid selama sesi browser.
        // Untuk simulasi yang lebih persisten antar sesi, Anda mungkin perlu menyimpan file ke server atau menggunakan base64 (tidak ideal untuk file besar).
        // Untuk kesederhanaan simulasi localStorage, kita akan simpan nama filenya saja atau placeholder.
        image: formData.logo ? formData.logo.name : 'https://via.placeholder.com/300x200.png?text=No+Image', 
        categories: formData.categories,
        ownerId: user?.id, // Kaitkan dengan pengguna yang sedang login
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        zip: formData.zip,
        businessType: formData.businessType,
      };

      // Ambil data toko yang sudah ada dari localStorage
      const existingShops = JSON.parse(localStorage.getItem('melarUserShops') || '[]');
      // Tambahkan toko baru
      existingShops.push(newShopData);
      // Simpan kembali ke localStorage
      localStorage.setItem('melarUserShops', JSON.stringify(existingShops));

      // Update status 'hasShop' pada user di AuthContext dan localStorage
      if (user) {
        updateUserHasShop(true, newShopId);
      }

      setIsSubmitting(false);
      alert('Shop created successfully! (Simulated)');
      navigate('/shop-dashboard'); // Arahkan ke dashboard toko
    }, 1500);
  };
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <Store className="h-16 w-16 text-primary-600 mx-auto" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Create Your Shop</h2>
          <p className="mt-2 text-gray-600">Please log in to create your rental shop.</p>
        </div>
        <button
          onClick={() => navigate('/login', { state: { returnTo: '/create-shop' } })}
          className="btn-primary"
        >
          Log in to Continue
        </button>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-50 min-h-screen pb-16 fade-in">
      <div className="bg-primary-700 text-white py-10">
        <div className="container-custom">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Create Your Shop</h1>
          <p className="text-primary-100">
            Start renting your items and earning money
          </p>
        </div>
      </div>

      <div className="container-custom py-8">
        {/* Progress Steps */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center text-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                <Store className="h-5 w-5" />
              </div>
              <span className={`text-xs sm:text-sm ${step >= 1 ? 'text-primary-600 font-medium' : 'text-gray-500'}`}>
                Shop Details
              </span>
            </div>
            
            <div className={`flex-1 h-1 mx-1 sm:mx-2 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
            
            <div className="flex flex-col items-center text-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                <MapPin className="h-5 w-5" /> {/* Mengganti Upload dengan MapPin agar lebih relevan */}
              </div>
              <span className={`text-xs sm:text-sm ${step >= 2 ? 'text-primary-600 font-medium' : 'text-gray-500'}`}>
                Location
              </span>
            </div>
            
            <div className={`flex-1 h-1 mx-1 sm:mx-2 ${step >= 3 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
            
            <div className="flex flex-col items-center text-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                step >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                <Info className="h-5 w-5" />
              </div>
              <span className={`text-xs sm:text-sm ${step >= 3 ? 'text-primary-600 font-medium' : 'text-gray-500'}`}>
                Business Info
              </span>
            </div>
            
            <div className={`flex-1 h-1 mx-1 sm:mx-2 ${step >= 4 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
            
            <div className="flex flex-col items-center text-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                step >= 4 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                <CheckCircle className="h-5 w-5" />
              </div>
              <span className={`text-xs sm:text-sm ${step >= 4 ? 'text-primary-600 font-medium' : 'text-gray-500'}`}>
                Review
              </span>
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
          
          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="p-6">
                <div className="space-y-6">
                  <div>
                    <label htmlFor="shopName" className="block text-sm font-medium text-gray-700 mb-1">
                      Shop Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="shopName"
                      type="text"
                      name="shopName"
                      value={formData.shopName}
                      onChange={handleInputChange}
                      className="input w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      className="input w-full"
                      placeholder="Describe your shop and what items you plan to rent out"
                      required
                    ></textarea>
                  </div>
                  
                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      id="phoneNumber"
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      className="input w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shop Logo
                    </label>
                    <div className="mt-1 flex items-center">
                      <div className="w-24 h-24 border border-gray-300 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                        {formData.logo ? (
                          <img 
                            src={URL.createObjectURL(formData.logo)} 
                            alt="Shop logo preview" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Store className="h-12 w-12 text-gray-400" />
                        )}
                      </div>
                      <label htmlFor="logoUpload" className="cursor-pointer ml-5 bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50">
                        <span>Upload Logo</span>
                        <input 
                          id="logoUpload"
                          type="file" 
                          name="logo"
                          onChange={handleLogoChange}
                          accept="image/*"
                          className="sr-only" 
                        />
                      </label>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Recommended size: 500x500px. Max file size: 5MB
                    </p>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                  <button
                    type="button"
                    onClick={nextStep}
                    className="btn-primary"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}
            
            {step === 2 && (
              <div className="p-6">
                <div className="space-y-6">
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="address"
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="input w-full"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="city"
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="input w-full"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                        State <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="state"
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="input w-full"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">
                        ZIP Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="zip"
                        type="text"
                        name="zip"
                        value={formData.zip}
                        onChange={handleInputChange}
                        className="input w-full"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <Info className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Location Privacy</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>
                            Your exact address will not be displayed to customers. Only the city and state will be shown publicly.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-between">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="btn-secondary"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="btn-primary"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}
            
            {step === 3 && (
              <div className="p-6">
                <div className="space-y-6">
                  <div>
                    <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-1">
                      Business Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="businessType"
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleInputChange}
                      className="input w-full"
                      required
                    >
                      <option value="">Select business type</option>
                      <option value="individual">Individual</option>
                      <option value="registered_business">Registered Business</option>
                      <option value="non_profit">Non-Profit</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Item Categories <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-gray-500 mb-3">
                      Select categories that best describe the items you plan to rent out
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {['Electronics', 'Tools & Equipment', 'Photography', 'Outdoor Gear', 'Vehicles', 'Clothing', 'Sports Equipment', 'Party Supplies'].map(category => (
                        <label key={category} className="flex items-center">
                          <input
                            type="checkbox"
                            name="category" // Bisa juga name unik seperti `category-${category}`
                            value={category}
                            checked={formData.categories.includes(category)}
                            onChange={handleCheckboxChange}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{category}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-yellow-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">Important Note</h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>
                            You're responsible for ensuring all items you rent comply with local laws and regulations, including safety standards.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-between">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="btn-secondary"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="btn-primary"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}
            
            {step === 4 && (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="font-medium text-lg mb-4">Review Your Shop Details</h3>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Shop Information</h4>
                        <p className="font-medium">{formData.shopName}</p>
                        <p className="text-sm text-gray-700 mt-1">{formData.description}</p>
                        <p className="text-sm text-gray-700 mt-1">{formData.phoneNumber || 'No phone number provided'}</p>
                      </div>
                      
                      {formData.logo && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-1">Shop Logo</h4>
                            <img src={URL.createObjectURL(formData.logo)} alt="Shop Logo" className="w-24 h-24 object-cover rounded-md"/>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Location</h4>
                      <p>{formData.address}</p>
                      <p>{`${formData.city}, ${formData.state} ${formData.zip}`}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Business Type</h4>
                      <p className="capitalize">{formData.businessType.replace('_', ' ')}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Item Categories</h4>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {formData.categories.map(category => (
                          <span 
                            key={category} 
                            className="bg-primary-100 text-primary-800 px-2 py-1 rounded text-xs"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md mb-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="termsAgreed"
                      checked={formData.termsAgreed}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      required
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      I agree to Melar's <a href="#" className="text-primary-600 hover:underline">Terms of Service</a> and <a href="#" className="text-primary-600 hover:underline">Rental Policies</a>
                    </span>
                  </label>
                </div>
                
                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="btn-secondary"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`btn-primary ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? 'Creating Shop...' : 'Create Shop'}
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