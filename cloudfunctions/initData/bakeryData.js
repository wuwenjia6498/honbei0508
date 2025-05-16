// 烘焙商品默认数据
module.exports = {
  categories: [
    { 
      name: '蛋糕', 
      icon: '/assets/images/categories/cake.jpg', 
      productCount: 3,
      isActive: true
    },
    { 
      name: '面包', 
      icon: '/assets/images/categories/bread.jpg', 
      productCount: 3,
      isActive: true
    },
    { 
      name: '甜点', 
      icon: '/assets/images/categories/dessert.jpg', 
      productCount: 2,
      isActive: true
    },
    { 
      name: '饼干', 
      icon: '/assets/images/categories/cookies.jpg', 
      productCount: 2,
      isActive: true
    }
  ],
  products: [
    {
      name: '提拉米苏',
      price: 68,
      originalPrice: 88,
      description: '经典意大利甜点，由浸泡在咖啡中的手指饼干和甜奶油奶酪制成。',
      image: '/assets/images/products/product-tiramisu.jpg',
      category: '蛋糕',
      stock: 100,
      sales: 320,
      isActive: true,
      isNew: true,
      isHot: true,
      isFeatured: true
    },
    {
      name: '芒果千层',
      price: 148,
      originalPrice: 168,
      description: '层层叠叠的薄饼与新鲜芒果奶油，口感丰富，甜而不腻。',
      image: '/assets/images/products/product-mango-layer.jpg',
      category: '蛋糕',
      stock: 80,
      sales: 256,
      isActive: true,
      isNew: true,
      isHot: true,
      isFeatured: true
    },
    {
      name: '草莓蛋糕',
      price: 98,
      originalPrice: 118,
      description: '新鲜草莓点缀的轻盈蛋糕，搭配香草奶油，酸甜可口。',
      image: '/assets/images/products/product-strawberry-cake.jpg',
      category: '蛋糕',
      stock: 90,
      sales: 190,
      isActive: true,
      isNew: true,
      isHot: false,
      isFeatured: false
    },
    {
      name: '法式面包',
      price: 28,
      originalPrice: 35,
      description: '外酥里软的经典法式长棍面包，搭配各类早餐食材的理想选择。',
      image: '/assets/images/products/product-french-bread.jpg',
      category: '面包',
      stock: 150,
      sales: 420,
      isActive: true,
      isNew: false,
      isHot: true,
      isFeatured: true
    },
    {
      name: '全麦面包',
      price: 32,
      originalPrice: 42,
      description: '使用优质全麦面粉制作，富含膳食纤维，健康营养的选择。',
      image: '/assets/images/products/product-wheat-bread.jpg',
      category: '面包',
      stock: 120,
      sales: 280,
      isActive: true,
      isNew: false,
      isHot: true,
      isFeatured: true
    }
  ]
}; 