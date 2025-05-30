// frontend/src/data/dummyDataInitializer.ts
import type { User, Shop, AppProduct } from '../types';

export const LOCAL_STORAGE_KEYS = {
  USERS: 'melarUsers',
  LOGGED_IN_USER: 'user',
  SHOPS: 'melarUserShops',
  SHOP_PRODUCTS_PREFIX: 'melarShopProducts_',
  ALL_PRODUCTS: 'melarAllDisplayProducts',
  SHOP_ORDERS_PREFIX: 'melarShopOrders_',
  USER_RENTALS_PREFIX: 'melarUserRentals_'
};

// === PENGGUNA DUMMY ===
export const dummyUsers: User[] = [
  {
    id: 'user_001_andi',
    name: 'Demo Rental Kamera',
    email: 'demo@example.com',
    hasShop: true,
    shopId: 'shop_001_kamera',
    phone: '081234567890',
    address: 'Jl. Kebon Jeruk No. 1, Jakarta',
  },
  {
    id: 'user_002_budi',
    name: 'Budi Perkakas',
    email: 'budi.perkakas@example.com',
    hasShop: true,
    shopId: 'shop_002_perkakas',
    phone: '081234567891',
    address: 'Jl. Raya Darmo No. 2, Surabaya',
  },
  {
    id: 'user_003_citra',
    name: 'Citra Alat Outdoor',
    email: 'citra.outdoor@example.com',
    hasShop: true,
    shopId: 'shop_003_outdoor',
    phone: '081234567892',
    address: 'Jl. Dago Atas No. 3, Bandung',
  },
  {
    id: 'user_004_dewi',
    name: 'Dewi Elektronik',
    email: 'dewi.elektronik@example.com',
    hasShop: true,
    shopId: 'shop_004_elektronik',
    phone: '081234567893',
    address: 'Jl. Malioboro No. 4, Yogyakarta',
  },
  {
    id: 'user_005_eko',
    name: 'Eko Pesta Pora',
    email: 'eko.pesta@example.com',
    hasShop: true,
    shopId: 'shop_005_pesta',
    phone: '081234567894',
    address: 'Jl. Kesawan No. 5, Medan',
  },
  {
    id: 'user_999_fani',
    name: 'Fani Penyewa',
    email: 'fani.penyewa@example.com',
    hasShop: false,
    phone: '081234567895',
    address: 'Jl. Sudirman No. 6, Jakarta Pusat',
  }
];

// === TOKO DUMMY ===
export const dummyShops: Shop[] = [
  {
    id: 'shop_001_kamera',
    name: "Demo Lensa & Kamera",
    description: 'Sewa kamera DSLR, mirrorless, lensa, dan aksesoris fotografi profesional.',
    location: 'Jakarta Selatan, ID',
    rating: 4.9,
    totalRentals: 120,
    image: 'https://images.pexels.com/photos/274973/pexels-photo-274973.jpeg?auto=compress&cs=tinysrgb&w=600',
    categories: ['Photography', 'Electronics'],
    ownerId: 'user_001_andi',
    phoneNumber: '081200010001',
    address: 'Jl. Fotografi No. 1A, Kemang',
    city: 'Jakarta Selatan',
    state: 'DKI Jakarta',
    zip: '12001',
    businessType: 'individual',
  },
  {
    id: 'shop_002_perkakas',
    name: "Budi Jaya Perkakas",
    description: 'Alat-alat pertukangan dan konstruksi lengkap untuk kebutuhan proyek Anda.',
    location: 'Surabaya, ID',
    rating: 4.7,
    totalRentals: 95,
    image: 'https://images.pexels.com/photos/1249611/pexels-photo-1249611.jpeg?auto=compress&cs=tinysrgb&w=600',
    categories: ['Tools & Equipment'],
    ownerId: 'user_002_budi',
    phoneNumber: '081200020002',
    address: 'Jl. Perkakas No. 2B, Wonokromo',
    city: 'Surabaya',
    state: 'Jawa Timur',
    zip: '60002',
    businessType: 'registered_business',
  },
  {
    id: 'shop_003_outdoor',
    name: "Citra Alam Terbuka",
    description: 'Peralatan camping, hiking, dan kegiatan outdoor berkualitas.',
    location: 'Bandung, ID',
    rating: 4.8,
    totalRentals: 150,
    image: 'https://images.pexels.com/photos/6271625/pexels-photo-6271625.jpeg?auto=compress&cs=tinysrgb&w=600',
    categories: ['Outdoor Gear', 'Sports Equipment'],
    ownerId: 'user_003_citra',
    phoneNumber: '081200030003',
    address: 'Jl. Alam Raya No. 3C, Dago Pakar',
    city: 'Bandung',
    state: 'Jawa Barat',
    zip: '40003',
    businessType: 'individual',
  },
  {
    id: 'shop_004_elektronik',
    name: "Dewi Gadget & Sound",
    description: 'Sewa proyektor, sound system, dan gadget elektronik lainnya.',
    location: 'Yogyakarta, ID',
    rating: 4.6,
    totalRentals: 70,
    image: 'https://images.pexels.com/photos/3782901/pexels-photo-3782901.jpeg?auto=compress&cs=tinysrgb&w=600',
    categories: ['Electronics', 'Party Supplies'],
    ownerId: 'user_004_dewi',
    phoneNumber: '081200040004',
    address: 'Jl. Elektronika No. 4D, Gejayan',
    city: 'Yogyakarta',
    state: 'DI Yogyakarta',
    zip: '55004',
    businessType: 'registered_business',
  },
  {
    id: 'shop_005_pesta',
    name: "Eko Pesta Meriah",
    description: 'Perlengkapan pesta, dari dekorasi hingga alat catering.',
    location: 'Medan, ID',
    rating: 4.5,
    totalRentals: 60,
    image: 'https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg?auto=compress&cs=tinysrgb&w=600',
    categories: ['Party Supplies', 'Decorations'],
    ownerId: 'user_005_eko',
    phoneNumber: '081200050005',
    address: 'Jl. Pesta No. 5E, Polonia',
    city: 'Medan',
    state: 'Sumatera Utara',
    zip: '20005',
    businessType: 'individual',
  }
];

// === PRODUK DUMMY UNTUK SETIAP TOKO ===
export const dummyProductsForShops: AppProduct[] = [
  {
    id: 'prod_andi_dslr_001', shopId: 'shop_001_kamera', name: 'Canon EOS 5D Mark IV',
    description: 'Kamera DSLR full-frame profesional dengan sensor 30.4MP, video 4K, dan Dual Pixel AF. Cocok untuk fotografi pernikahan, event, dan studio.', price: 150.00,
    images: ['https://images.pexels.com/photos/51383/photo-camera-subject-photographer-51383.jpeg?auto=compress&cs=tinysrgb&w=600', 'https://images.pexels.com/photos/243757/pexels-photo-243757.jpeg?auto=compress&cs=tinysrgb&w=600'],
    category: 'Photography', rating: 4.9, available: true,
    owner: { id: 'shop_001_kamera', name: "Demo Lensa & Kamera" }, status: 'available', rentals: 30,
  },
  {
    id: 'prod_andi_lens_002', shopId: 'shop_001_kamera', name: 'Lensa Canon EF 70-200mm f/2.8L IS III USM',
    description: 'Lensa zoom telephoto profesional dengan stabilisasi gambar, ideal untuk olahraga dan potret.', price: 80.00,
    images: ['https://images.pexels.com/photos/3907507/pexels-photo-3907507.jpeg?auto=compress&cs=tinysrgb&w=600'],
    category: 'Photography', rating: 4.8, available: true,
    owner: { id: 'shop_001_kamera', name: "Demo Lensa & Kamera" }, status: 'available', rentals: 20,
  },
  {
    id: 'prod_budi_drill_001', shopId: 'shop_002_perkakas', name: 'Bosch Impact Drill Cordless GSB 18V-50',
    description: 'Bor tanpa kabel bertenaga tinggi dengan fungsi impact untuk beton. Termasuk 2 baterai dan charger.', price: 30.00,
    images: ['https://images.pexels.com/photos/8107939/pexels-photo-8107939.jpeg?auto=compress&cs=tinysrgb&w=600'],
    category: 'Tools & Equipment', rating: 4.7, available: true,
    owner: { id: 'shop_002_perkakas', name: "Budi Jaya Perkakas" }, status: 'available', rentals: 50,
  },
  {
    id: 'prod_budi_saw_002', shopId: 'shop_002_perkakas', name: 'Makita Circular Saw 7 Inch 5007NF',
    description: 'Gergaji circular 7 inci yang kuat dan handal untuk berbagai pekerjaan potong kayu.', price: 40.00,
    images: ['https://images.pexels.com/photos/175029/pexels-photo-175029.jpeg?auto=compress&cs=tinysrgb&w=600'],
    category: 'Tools & Equipment', rating: 4.6, available: false,
    owner: { id: 'shop_002_perkakas', name: "Budi Jaya Perkakas" }, status: 'rented', rentals: 25,
  },
  {
    id: 'prod_citra_tent_001', shopId: 'shop_003_outdoor', name: 'Tenda Dome Eiger Kapasitas 6 Orang',
    description: 'Tenda dome yang luas, tahan air, dan mudah dipasang. Cocok untuk camping keluarga atau grup.', price: 55.00,
    images: ['https://images.pexels.com/photos/1687845/pexels-photo-1687845.jpeg?auto=compress&cs=tinysrgb&w=600', 'https://images.pexels.com/photos/2666598/pexels-photo-2666598.jpeg?auto=compress&cs=tinysrgb&w=600'],
    category: 'Outdoor Gear', rating: 4.8, available: true,
    owner: { id: 'shop_003_outdoor', name: "Citra Alam Terbuka" }, status: 'available', rentals: 40,
  },
  {
    id: 'prod_citra_bike_002', shopId: 'shop_003_outdoor', name: 'Sepeda Gunung Polygon TrailBlazer X2',
    description: 'Sepeda gunung full-suspension yang tangguh untuk medan berat. Ukuran M.', price: 60.00,
    images: ['https://images.pexels.com/photos/100582/pexels-photo-100582.jpeg?auto=compress&cs=tinysrgb&w=600'],
    category: 'Sports Equipment', rating: 4.7, available: true,
    owner: { id: 'shop_003_outdoor', name: "Citra Alam Terbuka" }, status: 'available', rentals: 35,
  },
   {
    id: 'prod_dewi_projector_001', shopId: 'shop_004_elektronik', name: 'Proyektor Epson EB-S41 HD 3300 Lumens',
    description: 'Proyektor kualitas tinggi dengan kecerahan 3300 lumens dan resolusi HD. Termasuk layar 70 inch.', price: 80.00,
    images: ['https://images.pexels.com/photos/1525589/pexels-photo-1525589.jpeg?auto=compress&cs=tinysrgb&w=600'],
    category: 'Electronics', rating: 4.6, available: true,
    owner: { id: 'shop_004_elektronik', name: "Dewi Gadget & Sound" }, status: 'available', rentals: 20,
  },
  {
    id: 'prod_dewi_speaker_002', shopId: 'shop_004_elektronik', name: 'Speaker Aktif Huper 15HA400 (Pair)',
    description: 'Sepasang speaker aktif 15 inci bertenaga 400W, cocok untuk acara kecil hingga menengah.', price: 100.00,
    images: ['https://images.pexels.com/photos/1916824/pexels-photo-1916824.jpeg?auto=compress&cs=tinysrgb&w=600'],
    category: 'Electronics', rating: 4.5, available: true,
    owner: { id: 'shop_004_elektronik', name: "Dewi Gadget & Sound" }, status: 'available', rentals: 15,
  },
  {
    id: 'prod_eko_fog_001', shopId: 'shop_005_pesta', name: 'Mesin Kabut Pesta 1500W',
    description: 'Mesin kabut untuk efek panggung atau pesta. Termasuk 1 liter cairan kabut.', price: 35.00,
    images: ['https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600'],
    category: 'Party Supplies', rating: 4.4, available: true,
    owner: { id: 'shop_005_pesta', name: "Eko Pesta Meriah" }, status: 'available', rentals: 10,
  },
  {
    id: 'prod_eko_tableset_002', shopId: 'shop_005_pesta', name: 'Set Meja Kursi Lipat Futura (10 set)',
    description: '10 set meja (120x60cm) dan 40 kursi lipat Futura. Kuat dan praktis.', price: 120.00,
    images: ['https://images.pexels.com/photos/271795/pexels-photo-271795.jpeg?auto=compress&cs=tinysrgb&w=600'],
    category: 'Party Supplies', rating: 4.6, available: true,
    owner: { id: 'shop_005_pesta', name: "Eko Pesta Meriah" }, status: 'available', rentals: 8,
  }
];

export const initialGeneralProducts: AppProduct[] = [];

export const initializeLocalStorageWithDummies = () => {
  const initKey = 'melar_dummy_data_initialized_v2.1';

  if (localStorage.getItem(initKey) !== 'true') {
    console.log(`Initializing dummy data in localStorage (version ${initKey})...`);

    localStorage.setItem(LOCAL_STORAGE_KEYS.USERS, JSON.stringify(dummyUsers));
    localStorage.setItem(LOCAL_STORAGE_KEYS.SHOPS, JSON.stringify(dummyShops));

    dummyShops.forEach(shopItem => { // Mengganti nama variabel 'shop' menjadi 'shopItem'
      const shopProductsKey = `${LOCAL_STORAGE_KEYS.SHOP_PRODUCTS_PREFIX}${shopItem.id}`;
      const productsForThisShop = dummyProductsForShops.filter(p => p.shopId === shopItem.id);
      localStorage.setItem(shopProductsKey, JSON.stringify(productsForThisShop));
    });

    let allDisplayProducts: AppProduct[] = [];
    dummyShops.forEach(shopItem => { // Mengganti nama variabel 'shop' menjadi 'shopItem'
      const shopProductsKey = `${LOCAL_STORAGE_KEYS.SHOP_PRODUCTS_PREFIX}${shopItem.id}`;
      const productsString = localStorage.getItem(shopProductsKey);
      if (productsString) {
        const shopProducts: AppProduct[] = JSON.parse(productsString);
        shopProducts.forEach(sp => {
          if (!allDisplayProducts.find(p => p.id === sp.id)) {
            allDisplayProducts.push(sp);
          }
        });
      }
    });
    initialGeneralProducts.forEach(gp => {
        if (!allDisplayProducts.find(dp => dp.id === gp.id)) {
            allDisplayProducts.push(gp);
        }
    });
    localStorage.setItem(LOCAL_STORAGE_KEYS.ALL_PRODUCTS, JSON.stringify(allDisplayProducts));
    
    // Loop yang dilaporkan error pada baris 263 (asumsi ini loop-nya)
    dummyShops.forEach(s => { // Mengganti nama variabel 'shop' menjadi 's'
        localStorage.setItem(`${LOCAL_STORAGE_KEYS.SHOP_ORDERS_PREFIX}${s.id}`, JSON.stringify([]));
    });
    // Loop yang dilaporkan error pada baris 278 (asumsi ini loop-nya)
    dummyUsers.forEach(u => { // Mengganti nama variabel 'user' menjadi 'u'
        localStorage.setItem(`${LOCAL_STORAGE_KEYS.USER_RENTALS_PREFIX}${u.id}`, JSON.stringify([]));
    });

    localStorage.setItem(initKey, 'true');
    console.log("Dummy data initialization complete.");
  } else {
    console.log(`Dummy data (version ${initKey}) already initialized. Skipping.`);
  }
};