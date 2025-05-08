// product.js
// 导入云API模块
const { productApi, cartApi } = require('../../utils/cloudApi');

Page({
  data: {
    product: null, // 初始化为null
    isLoading: true, // 添加加载状态
    selectedFlavor: 'original',  // 默认原味
    selectedFilling: 'none',     // 默认无馅料
    quantity: 1,                 // 默认数量
    specialRequest: '',          // 特殊要求
    totalPrice: 0,               // 总价格
    hasStock: false,             // 是否有库存
  },

  onLoad: function(options) {
    // 获取商品ID，从服务器获取商品数据
    const productId = options.id;
    console.log('商品ID:', productId);
    
    if (productId) {
      this.fetchProductDetail(productId);
    } else {
      wx.showToast({
        title: '商品ID不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },
  
  // 获取商品详情
  fetchProductDetail: async function(productId) {
    try {
      wx.showLoading({
        title: '加载中...',
      });
      
      const result = await productApi.getProductDetail(productId);
      
      if (result.success && result.data) {
        // 获取库存状态
        const stock = result.data.stock !== undefined ? result.data.stock : 0;
        const hasStock = stock > 0;
        
        this.setData({
          product: result.data,
          isLoading: false,
          hasStock: hasStock
        });
        // 设置初始总价
        this.calculateTotalPrice();
      } else {
        wx.showToast({
          title: '商品不存在',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('获取商品详情失败:', error);
      wx.showToast({
        title: '获取商品信息失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
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
    // 检查库存是否足够
    const stock = this.data.product.stock !== undefined ? this.data.product.stock : 0;
    if (this.data.quantity >= stock) {
      wx.showToast({
        title: '库存不足',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    this.setData({
      quantity: this.data.quantity + 1
    });
    this.calculateTotalPrice();
    
    // 更新库存状态
    this.updateStockStatus();
  },
  
  // 减少数量
  decreaseQuantity: function() {
    if (this.data.quantity > 1) {
      this.setData({
        quantity: this.data.quantity - 1
      });
      this.calculateTotalPrice();
      
      // 更新库存状态
      this.updateStockStatus();
    }
  },
  
  // 更新库存状态
  updateStockStatus: function() {
    if (!this.data.product) return;
    
    const stock = this.data.product.stock !== undefined ? this.data.product.stock : 0;
    const hasStock = stock > 0 && stock >= this.data.quantity;
    
    this.setData({
      hasStock: hasStock
    });
  },
  
  // 更新特殊要求
  updateSpecialRequest: function(e) {
    this.setData({
      specialRequest: e.detail.value
    });
  },
  
  // 计算总价
  calculateTotalPrice: function() {
    if (!this.data.product) return;
    
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
  addToCart: async function() {
    if (!this.data.product) return;
    
    // 检查库存是否足够
    const stock = this.data.product.stock !== undefined ? this.data.product.stock : 0;
    if (stock <= 0 || stock < this.data.quantity) {
      wx.showToast({
        title: '商品库存不足',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    try {
      wx.showLoading({
        title: '添加中...'
      });
      
      const result = await cartApi.addToCart(this.data.product._id, this.data.quantity);
      
      if (result.success) {
        wx.showToast({
          title: '已加入购物车',
          icon: 'success',
          duration: 2000
        });
      } else {
        wx.showToast({
          title: result.message || '添加失败',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('添加到购物车失败:', error);
      wx.showToast({
        title: '添加失败，请重试',
        icon: 'none',
        duration: 2000
      });
    } finally {
      wx.hideLoading();
    }
  },
  
  // 立即购买
  buyNow: function() {
    if (!this.data.product) return;
    
    // 检查库存是否足够
    const stock = this.data.product.stock !== undefined ? this.data.product.stock : 0;
    if (stock <= 0 || stock < this.data.quantity) {
      wx.showToast({
        title: '商品库存不足',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 跳转到结算页面
    wx.navigateTo({
      url: '/pages/checkout/checkout?from=buy_now&productId=' + this.data.product._id
           + '&flavor=' + this.data.selectedFlavor
           + '&filling=' + this.data.selectedFilling
           + '&quantity=' + this.data.quantity
           + '&special=' + encodeURIComponent(this.data.specialRequest)
    });
  }
}) 