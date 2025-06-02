// frontend/src/pages/WhatsAppOrderSentPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, MessageSquare } from 'lucide-react';

const WhatsAppOrderSentPage: React.FC = () => {
  // GANTI DENGAN NOMOR WA ADMIN ANDA YANG SEBENARNYA (format internasional tanpa + atau 0 di depan)
  const ADMIN_WHATSAPP_NUMBER_FOR_CONFIRMATION = "6281234567890"; 

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-center py-12 px-4 text-center fade-in">
      <div className="bg-white p-8 md:p-12 rounded-xl shadow-2xl max-w-lg w-full">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={48} className="text-green-500" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
          Pesanan Anda Sedang Diproses!
        </h1>
        <p className="text-gray-600 mb-3">
          Anda telah diarahkan ke WhatsApp untuk menyelesaikan pesanan Anda dengan admin kami.
        </p>
        <p className="text-gray-600 mb-8">
          Silakan lanjutkan percakapan di WhatsApp untuk konfirmasi ketersediaan, total biaya, dan detail pembayaran.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <a
            href={`https://wa.me/${ADMIN_WHATSAPP_NUMBER_FOR_CONFIRMATION}`} 
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex items-center justify-center py-3"
          >
            <MessageSquare size={20} className="mr-2" />
            Buka WhatsApp Lagi
          </a>
          <Link
            to="/products"
            className="btn-secondary flex items-center justify-center py-3"
          >
            Lanjut Belanja
          </Link>
        </div>
        <p className="text-xs text-gray-500 mt-8">
          Jika Anda tidak otomatis diarahkan ke WhatsApp, klik tombol "Buka WhatsApp Lagi". <br />
          Terima kasih telah memilih Melar!
        </p>
      </div>
    </div>
  );
};

export default WhatsAppOrderSentPage;