// Mock data for products
export const allProducts = [
  {
    id: '1',
    name: 'Professional DSLR Camera',
    description: 'High-quality DSLR camera perfect for professional photography. Includes standard lens, battery, and memory card.',
    price: 45.99,
    images: [
      'https://images.pexels.com/photos/243757/pexels-photo-243757.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/51383/photo-camera-subject-photographer-51383.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/1203803/pexels-photo-1203803.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
    ],
    category: 'Photography',
    rating: 4.8,
    available: true,
    owner: {
      id: '101',
      name: 'PhotoPro Shop'
    },
    reviews: [
      {
        user: 'Alex Johnson',
        rating: 5,
        comment: 'Excellent camera, takes amazing shots. Very well maintained.',
        date: 'March 15, 2023'
      },
      {
        user: 'Sarah Lee',
        rating: 5,
        comment: 'Perfect for my weekend photoshoot. Will rent again!',
        date: 'February 28, 2023'
      }
    ]
  },
  {
    id: '2',
    name: 'Mountain Bike - Pro Series',
    description: 'Professional mountain bike with 21 gears, front suspension, and all-terrain tires. Suitable for trails and mountain paths.',
    price: 35.50,
    images: [
      'https://images.pexels.com/photos/100582/pexels-photo-100582.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/4198566/pexels-photo-4198566.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/5462562/pexels-photo-5462562.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
    ],
    category: 'Sports Equipment',
    rating: 4.5,
    available: true,
    owner: {
      id: '102',
      name: 'Adventure Rentals'
    },
    reviews: [
      {
        user: 'Mike Thomas',
        rating: 4,
        comment: 'Great bike for mountain trails. The gears were smooth and the bike was in good condition.',
        date: 'April 2, 2023'
      }
    ]
  },
  {
    id: '3',
    name: 'Camping Tent (4-Person)',
    description: 'Spacious 4-person tent with waterproof material, easy setup, and mesh windows for ventilation. Perfect for family camping.',
    price: 25.99,
    images: [
      'https://images.pexels.com/photos/2666598/pexels-photo-2666598.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/6271625/pexels-photo-6271625.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/939723/pexels-photo-939723.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
    ],
    category: 'Outdoor Gear',
    rating: 4.3,
    available: true,
    owner: {
      id: '103',
      name: 'Outdoor Adventures'
    },
    reviews: [
      {
        user: 'Jennifer Wilson',
        rating: 5,
        comment: 'Perfect size for our family of four. Easy to set up and pack away.',
        date: 'March 27, 2023'
      },
      {
        user: 'David Miller',
        rating: 4,
        comment: 'Good tent, stayed dry during light rain. A bit heavy to carry though.',
        date: 'March 15, 2023'
      }
    ]
  },
  {
    id: '4',
    name: 'Electric Power Drill',
    description: 'Powerful electric drill with variable speed control, multiple drill bits included, and long-lasting battery.',
    price: 18.75,
    images: [
      'https://images.pexels.com/photos/1249611/pexels-photo-1249611.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/6055584/pexels-photo-6055584.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/8107939/pexels-photo-8107939.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
    ],
    category: 'Tools & Equipment',
    rating: 4.7,
    available: true,
    owner: {
      id: '104',
      name: 'ToolMaster Rentals'
    },
    reviews: [
      {
        user: 'Robert Chen',
        rating: 5,
        comment: 'Excellent drill, powerful and battery lasted longer than expected.',
        date: 'April 10, 2023'
      }
    ]
  },
  {
    id: '5',
    name: 'DJ Equipment Set',
    description: 'Complete DJ set including mixer, turntables, headphones, and speakers. Perfect for parties and events.',
    price: 89.99,
    images: [
      'https://images.pexels.com/photos/4602019/pexels-photo-4602019.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/5581340/pexels-photo-5581340.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/5581343/pexels-photo-5581343.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
    ],
    category: 'Electronics',
    rating: 4.9,
    available: false,
    owner: {
      id: '105',
      name: 'Music City Rentals'
    },
    reviews: [
      {
        user: 'Christina Park',
        rating: 5,
        comment: 'Amazing equipment! Made my party a huge success.',
        date: 'February 20, 2023'
      },
      {
        user: 'Jason Wang',
        rating: 5,
        comment: 'Professional quality equipment, everything worked perfectly.',
        date: 'January 15, 2023'
      }
    ]
  },
  {
    id: '6',
    name: 'Kayak with Paddle',
    description: 'Stable single-person kayak with comfortable seating, storage compartment, and high-quality paddle included.',
    price: 40.00,
    images: [
      'https://images.pexels.com/photos/1430672/pexels-photo-1430672.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/1497585/pexels-photo-1497585.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/10291008/pexels-photo-10291008.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
    ],
    category: 'Outdoor Gear',
    rating: 4.6,
    available: true,
    owner: {
      id: '103',
      name: 'Outdoor Adventures'
    },
    reviews: []
  },
  {
    id: '7',
    name: 'Projector and Screen',
    description: 'High-definition projector with 100-inch screen, HDMI connectivity, and built-in speakers. Perfect for home movie nights or presentations.',
    price: 55.00,
    images: [
      'https://images.pexels.com/photos/2251206/pexels-photo-2251206.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/3379934/pexels-photo-3379934.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/1525589/pexels-photo-1525589.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
    ],
    category: 'Electronics',
    rating: 4.4,
    available: true,
    owner: {
      id: '106',
      name: 'Tech Rentals Plus'
    },
    reviews: [
      {
        user: 'Michelle Rodriguez',
        rating: 4,
        comment: 'Great picture quality. Setup was easy with the provided instructions.',
        date: 'March 5, 2023'
      }
    ]
  },
  {
    id: '8',
    name: 'Formal Suit (Medium)',
    description: 'Elegant black formal suit in size medium, includes jacket and pants. Perfect for special occasions and business meetings.',
    price: 30.00,
    images: [
      'https://images.pexels.com/photos/1342609/pexels-photo-1342609.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/60047/suit-jacket-shirt-fashion-60047.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/1895843/pexels-photo-1895843.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
    ],
    category: 'Clothing',
    rating: 4.2,
    available: true,
    owner: {
      id: '107',
      name: 'Formal Wear Rentals'
    },
    reviews: []
  }
];

// Featured products for homepage
export const featuredProducts = allProducts.filter(product => product.rating >= 4.5 && product.available);

// Product categories
export const productCategories = [
  {
    id: 'Electronics',
    name: 'Electronics',
    count: 2,
    image: 'https://images.pexels.com/photos/4602019/pexels-photo-4602019.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
  },
  {
    id: 'Photography',
    name: 'Photography',
    count: 1,
    image: 'https://images.pexels.com/photos/243757/pexels-photo-243757.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
  },
  {
    id: 'Outdoor Gear',
    name: 'Outdoor Gear',
    count: 2,
    image: 'https://images.pexels.com/photos/2666598/pexels-photo-2666598.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
  },
  {
    id: 'Tools & Equipment',
    name: 'Tools & Equipment',
    count: 1,
    image: 'https://images.pexels.com/photos/1249611/pexels-photo-1249611.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
  },
  {
    id: 'Sports Equipment',
    name: 'Sports Equipment',
    count: 1,
    image: 'https://images.pexels.com/photos/100582/pexels-photo-100582.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
  },
  {
    id: 'Clothing',
    name: 'Clothing',
    count: 1,
    image: 'https://images.pexels.com/photos/1342609/pexels-photo-1342609.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
  }
];