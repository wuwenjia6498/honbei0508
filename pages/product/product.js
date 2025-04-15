// product.js
Page({
  data: {
    product: {
      id: 1,
      name: '法式牛角面包',
      price: 12,
      image: '/assets/images/products/product-croissant.jpg',
      rating: 4.9,
      reviews: 324,
      description: '采用进口法国黄油和高筋面粉精心制作，反复折叠出酥脆的96层口感。外壳金黄酥脆，内部松软多层，带有浓郁的黄油香气，每日现烤，口感绝佳。',
      ingredients: '高筋面粉、法国进口黄油、酵母、糖、盐',
      calories: '295',
      shelfLife: '建议24小时内食用',
      storage: '室温密封保存',
      bakingTime: '今日早上7:30',
      allergens: '含麸质、乳制品'
    },
    selectedFlavor: 'original',  // 默认原味
    selectedFilling: 'none',     // 默认无馅料
    quantity: 1,                 // 默认数量
    specialRequest: '',          // 特殊要求
    totalPrice: 0,               // 总价格
  },

  onLoad: function(options) {
    // 获取商品ID，正式项目中应该通过ID从服务器获取商品数据
    const productId = options.id;
    console.log('商品ID:', productId);
    
    // 设置初始总价
    this.calculateTotalPrice();
  },
  
  // 选择口味
  selectFlavor: function(e) {
    const flavor = e.currentTarget.dataset.flavor;
    this.setData({ selectedFlavor: flavor });
    this.calculateTotalPrice();
  },
  
  // 选择内馅
  selectFilling: function(e) {
    const filling = e.currentTarget.dataset.filling;
    this.setData({ selectedFilling: filling });
    this.calculateTotalPrice();
  },
  
  // 增加数量
  increaseQuantity: function() {
    this.setData({
      quantity: this.data.quantity + 1
    });
    this.calculateTotalPrice();
  },
  
  // 减少数量
  decreaseQuantity: function() {
    if (this.data.quantity > 1) {
      this.setData({
        quantity: this.data.quantity - 1
      });
      this.calculateTotalPrice();
    }
  },
  
  // 更新特殊要求
  updateSpecialRequest: function(e) {
    this.setData({
      specialRequest: e.detail.value
    });
  },
  
  // 计算总价
  calculateTotalPrice: function() {
    let basePrice = this.data.product.price;
    
    // 加上口味附加价格
    if (this.data.selectedFlavor === 'chocolate') {
      basePrice += 3;
    }
    
    // 加上内馅附加价格
    if (this.data.selectedFilling === 'almond') {
      basePrice += 4;
    }
    
    // 乘以数量
    const totalPrice = basePrice * this.data.quantity;
    
    this.setData({
      totalPrice: totalPrice
    });
  },
  
  // 返回上一页
  goBack: function() {
    wx.navigateBack();
  },
  
  // 添加到购物车
  addToCart: function() {
    // 在真实项目中，应该将选中的商品添加到购物车中
    // 这里用提示代替
    wx.showToast({
      title: '已加入购物车',
      icon: 'success',
      duration: 2000
    });
  },
  
  // 立即购买
  buyNow: function() {
    // 跳转到结算页面
    // 正式项目中，应该将商品信息传递给结算页面
    wx.showToast({
      title: '跳转到结算页',
      icon: 'none',
      duration: 2000
    });
    
    // wx.navigateTo({
    //   url: '/pages/checkout/checkout?from=buy_now&productId=' + this.data.product.id
    //        + '&flavor=' + this.data.selectedFlavor
    //        + '&filling=' + this.data.selectedFilling
    //        + '&quantity=' + this.data.quantity
    //        + '&special=' + encodeURIComponent(this.data.specialRequest)
    // });
  }
}) 