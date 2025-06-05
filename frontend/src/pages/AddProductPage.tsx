// frontend/src/pages/AddProductPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, PackagePlus, Loader2 } from 'lucide-react';
// PERHATIAN: Pastikan ProductFormData dan ProductForm.tsx diubah agar productFormData.images adalah File[]
import ProductForm, { ProductFormData } from '../components/products/ProductForm';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';

// Komponen Modal Sederhana untuk notifikasi
const SimpleModal: React.FC<{ title: string; message: string; onClose: () => void; type: 'success' | 'error' }> = ({ title, message, onClose, type }) => (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
    {/* Kelas 'animate-modalShow' dihapus karena definisi <style jsx> dihilangkan */}
    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full transform transition-all duration-300 ease-in-out scale-95 opacity-100"> {/* Default opacity to 1, scale to 1 */}
      <h3 className={`text-xl font-semibold mb-3 ${type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
        {title}
      </h3>
      <p className="text-gray-700 mb-6 whitespace-pre-wrap">{message}</p>
      <button
        onClick={onClose}
        className={`w-full px-4 py-2.5 rounded-md font-medium ${
          type === 'success' 
            ? 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500' 
            : 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
        } text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
      >
        Tutup
      </button>
    </div>
    {/* Blok <style jsx global> dihapus karena menyebabkan error TS2322 di lingkungan non-Next.js/styled-jsx */}
    {/* <style jsx global>{`
      @keyframes modalShow {
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      .animate-modalShow {
        animation: modalShow 0.3s forwards;
      }
    `}</style> 
    */}
  </div>
);

const AddProductPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const shopInfoFromState = location.state as { shopId?: string; shopName?: string } | undefined;
  const currentShopId = user?.shopId || shopInfoFromState?.shopId;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  // Fungsi untuk menangani pengiriman form produk
  const handleAddProduct = async (productFormData: ProductFormData) => {
    setNotification(null); // Bersihkan notifikasi sebelumnya

    if (!currentShopId) {
      const errMsg = "Informasi toko tidak ditemukan. Tidak dapat menambahkan produk. Pastikan Anda sudah login dan memiliki toko aktif.";
      console.error("[AddProductPage] " + errMsg, { userId: user?.id, currentShopId, userShopId: user?.shopId, shopInfoFromState });
      setNotification({ type: 'error', title: 'Error Toko', message: errMsg });
      return;
    }
    if (!productFormData.category_id) {
      setNotification({ type: 'error', title: 'Error Validasi', message: "Kategori produk wajib diisi. Silakan pilih kategori." });
      return;
    }

    // PERHATIAN: Diasumsikan productFormData.images dari ProductForm.tsx sekarang adalah File[]
    // if (!productFormData.images || productFormData.images.length === 0) {
    //   // Jika gambar wajib, aktifkan validasi ini.
    //   setNotification({ type: 'error', title: 'Error Validasi', message: "Minimal satu gambar produk wajib diunggah." });
    //   return;
    // }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('name', productFormData.name);
    formData.append('description', productFormData.description);
    formData.append('price', String(productFormData.price));
    if (productFormData.category_id) {
      formData.append('category_id', String(productFormData.category_id));
    }
    formData.append('available', String(productFormData.available));
    formData.append('shop_id', String(currentShopId));

    // Tambahkan berkas gambar ke FormData
    // Nama field ('images' di bawah) harus sesuai dengan yang diharapkan oleh serializer backend Anda.
    if (productFormData.images && Array.isArray(productFormData.images)) {
      productFormData.images.forEach((file: any) => { 
        if (file instanceof File) {
          formData.append('images', file, file.name); 
        } else {
          console.warn("[AddProductPage] Item dalam productFormData.images bukan objek File:", file);
        }
      });
    }

    console.log("[AddProductPage] Mengirim produk ke API dengan FormData. Entri:");
    for (const pair of formData.entries()) {
      console.log(pair[0] + ': ' + (pair[1] instanceof File ? `File (${pair[1].name})` : pair[1]));
    }

    try {
      // Panggil apiClient.post HANYA dengan dua argumen: endpoint dan body (formData).
      // Pengaturan header (termasuk Content-Type untuk FormData) sudah ditangani di dalam apiClient.ts.
      const newProductFromApi = await apiClient.post('/products/', formData);
      
      console.log("[AddProductPage] Produk berhasil ditambahkan via API:", newProductFromApi);

      setNotification({
        type: 'success',
        title: 'Sukses!',
        message: 'Produk baru berhasil ditambahkan.',
      });

    } catch (err: any) {
      console.error("[AddProductPage] Error menambahkan produk via API:", err);
      let errorMessage = 'Gagal menambahkan produk.';
      if (err.response && err.response.data && typeof err.response.data === 'object') {
        const backendErrors = err.response.data;
        const messages = Object.entries(backendErrors)
          .map(([field, e]) => {
            const errorMessages = Array.isArray(e) ? e.join(', ') : String(e);
            return `${field}: ${errorMessages}`;
          })
          .join(' | ');
        errorMessage += ` Detail: ${messages}`;
      } else if (err.message) {
        errorMessage += ` Pesan: ${err.message}`;
      }
      setNotification({ type: 'error', title: 'Gagal Menambahkan Produk', message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        console.log("[AddProductPage] Pengguna tidak terautentikasi, mengarahkan ke login.");
        navigate('/login', { state: { returnTo: location.pathname } });
      } else if (!currentShopId) {
        console.warn("[AddProductPage] Pengguna terautentikasi tetapi shopId tidak tersedia setelah auth loading.");
         setNotification({
            type: 'error',
            title: 'Informasi Toko Bermasalah',
            message: 'Informasi toko Anda tidak tersedia. Pastikan Anda telah membuat toko atau coba login ulang.'
        });
      }
    }
  }, [authLoading, isAuthenticated, currentShopId, navigate, location.pathname]);

  if (authLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)] text-gray-600">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600 mb-4" />
        <p className="text-lg">Memuat status autentikasi...</p>
      </div>
    );
  }

  if (!isAuthenticated && !authLoading) { 
    return <div className="text-center py-10 text-gray-700">Silakan login untuk menambahkan produk. Mengarahkan ke halaman login...</div>;
  }
  
  if (isAuthenticated && !currentShopId && !authLoading) {
    return (
      <div className="container-custom py-10 text-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-lg mx-auto">
            <h2 className="text-2xl font-semibold text-red-600 mb-4">Tidak Dapat Menambahkan Produk</h2>
            <p className="text-gray-700 mb-3">
                Informasi toko Anda tidak tersedia. Ini mungkin karena Anda belum membuat toko,
                atau ada masalah saat mengambil detail toko Anda.
            </p>
            <p className="text-gray-600 mt-2 mb-6">
                Pastikan Anda telah membuat toko, atau coba keluar dan masuk kembali.
            </p>
            <div className="space-y-3 sm:space-y-0 sm:space-x-3">
                <button onClick={() => navigate('/create-shop')} className="btn-primary w-full sm:w-auto">Buat Toko</button>
                <button onClick={() => navigate('/shop-dashboard')} className="btn-secondary w-full sm:w-auto">Ke Dashboard Toko</button>
            </div>
        </div>
      </div>
    );
  }

  const handleModalClose = () => {
    if (notification?.type === 'success') {
      navigate('/shop-dashboard', { state: { tab: 'products', refreshProducts: true } });
    }
    setNotification(null);
  };

  return (
    <div className="bg-gray-100 min-h-screen pb-16">
      {notification && (
        <SimpleModal
          title={notification.title}
          message={notification.message}
          type={notification.type}
          onClose={handleModalClose}
        />
      )}
      <div className="bg-white border-b border-gray-200">
        <div className="container-custom py-4">
          <button
            onClick={() => navigate('/shop-dashboard', { state: { tab: 'products' } })}
            className="flex items-center text-sm text-gray-700 hover:text-primary-600 transition-colors font-medium"
            disabled={isSubmitting}
          >
            <ArrowLeft size={18} className="mr-1.5" />
            Kembali ke Daftar Produk
          </button>
        </div>
      </div>
      <div className="container-custom py-8 sm:py-12">
        <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 md:p-10 rounded-xl shadow-lg">
          <div className="flex items-center mb-6 pb-5 border-b border-gray-200">
            <PackagePlus size={32} className="text-primary-600 mr-3" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Tambah Produk Baru</h1>
          </div>
          
          {currentShopId && isAuthenticated ? ( 
            <ProductForm
              onSubmit={handleAddProduct}
              isSubmitting={isSubmitting}
              submitButtonText={isSubmitting ? "Menambahkan..." : "Tambah Produk"}
            />
          ) : (
            <div className="text-center py-10 text-gray-600">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-3" />
                <p>Memuat informasi toko atau toko tidak ditemukan...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddProductPage;
