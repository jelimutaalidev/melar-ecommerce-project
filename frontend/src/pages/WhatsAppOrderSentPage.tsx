// frontend/src/pages/WhatsAppOrderSentPage.tsx

import React from 'react';
// Impor 'useLocation' untuk bisa membaca data yang dikirim saat navigasi
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, MessageSquare, ArrowLeft } from 'lucide-react';

const WhatsAppOrderSentPage: React.FC = () => {
  // Gunakan hook useLocation untuk mendapatkan data dari halaman sebelumnya
  const location = useLocation();

  // Ambil URL WhatsApp LENGKAP dari state navigasi yang dikirim CheckoutPage
  // URL ini sudah berisi nomor tujuan DAN detail pesanan
  const whatsappUrl = location.state?.whatsappUrl;
  
  // Ambil juga orderId untuk bisa ditampilkan ke pengguna
  const orderId = location.state?.orderId;

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-center py-12 px-4 text-center fade-in">
      <div className="bg-white p-8 md:p-12 rounded-xl shadow-2xl max-w-lg w-full">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={48} className="text-green-500" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
          Pesanan Anda Sedang Diproses!
        </h1>

        {/* Menampilkan ID Pesanan agar lebih informatif */}
        {orderId && (
            <p className="text-sm text-gray-500 mb-4">
                Ref Pesanan: <strong>{orderId}</strong>
            </p>
        )}

        <p className="text-gray-600 mb-8">
          Silakan lanjutkan percakapan di WhatsApp yang telah terbuka untuk konfirmasi detail pesanan.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          {/* Tombol ini sekarang menggunakan URL lengkap dari state */}
          <a
            href={whatsappUrl || '#'} // Gunakan URL lengkap, atau '#' jika tidak ada
            target="_blank"
            rel="noopener noreferrer"
            // Tombol akan terlihat nonaktif jika URL tidak ada
            className={`btn-primary flex items-center justify-center py-3 ${!whatsappUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
            // Mencegah klik jika URL tidak ada
            onClick={(e) => {
              if (!whatsappUrl) {
                e.preventDefault();
                alert('Detail pesanan tidak ditemukan untuk dibuka di WhatsApp.');
              }
            }}
          >
            <MessageSquare size={20} className="mr-2" />
            Buka WhatsApp Lagi
          </a>
          <Link
            to="/products"
            className="btn-secondary flex items-center justify-center py-3"
          >
            <ArrowLeft size={20} className="mr-2" />
            Lanjut Belanja
          </Link>
        </div>

        <p className="text-xs text-gray-500 mt-8">
          Jika Anda tidak otomatis diarahkan ke WhatsApp, klik tombol "Buka WhatsApp Lagi". <br />
          Terima kasih telah memilih Melar!
        </p>

        {/* Menampilkan pesan error jika halaman ini diakses tanpa data whatsappUrl */}
        {!whatsappUrl && (
            <p className="text-xs text-red-500 mt-4 font-semibold">
                Terjadi kesalahan. Tidak dapat membuka detail pesanan di WhatsApp.
            </p>
        )}
      </div>
    </div>
  );
};

export default WhatsAppOrderSentPage;