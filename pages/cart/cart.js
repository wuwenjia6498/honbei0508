// pages/cart/cart.js
Page({
  data: {
    cartItems: [
      {
        id: 1,
        name: '法式牛角面包',
        desc: '原味・标准烘烤・简易包装',
        price: 12,
        image: '/assets/images/products/product-croissant.jpg',
        count: 2,
        checked: true
      },
      {
        id: 2,
        name: '抹茶红豆蛋糕',
        desc: '标准甜度・小杯装',
        price: 28,
        image: '/assets/images/products/product-matcha-cake.jpg',
        count: 1,
        checked: true
      },
      {
        id: 3,
        name: '经典提拉米苏',
        desc: '标准甜度・小盒装',
        price: 38,
        image: '/assets/images/products/product-tiramisu.jpg',
        count: 1,
        checked: true
      }
    ],
    deliveryFee: 8,
    discount: 10,
    allChecked: true,
    isEditing: false,
  },

  onLoad() {
    this.calculateTotal();
  },

  // 计算总价和商品数量
  calculateTotal() {
    let totalPrice = 0;
    let totalCount = 0;
    
    this.data.cartItems.forEach(item => {
      if (item.checked) {
        totalPrice += item.price * item.count;
        totalCount += item.count;
      }
    });
    
    // 添加配送费和优惠
    const subtotal = totalPrice;
    const finalPrice = subtotal + this.data.deliveryFee - this.data.discount;

    this.setData({
      subtotal: subtotal.toFixed(2),
      totalPrice: finalPrice.toFixed(2),
      totalCount: totalCount
    });
  },

  // 商品数量增加
  onIncreaseCount(e) {
    const index = e.currentTarget.dataset.index;
    const cartItems = this.data.cartItems;
    cartItems[index].count += 1;
    
    this.setData({
      cartItems: cartItems
    });
    
    this.calculateTotal();
  },

  // 商品数量减少
  onDecreaseCount(e) {
    const index = e.currentTarget.dataset.index;
    const cartItems = this.data.cartItems;
    
    if (cartItems[index].count > 1) {
      cartItems[index].count -= 1;
      
      this.setData({
        cartItems: cartItems
      });
      
      this.calculateTotal();
    }
  },

  // 切换单个商品选中状态
  onToggleItemCheck(e) {
    const index = e.currentTarget.dataset.index;
    const cartItems = this.data.cartItems;
    cartItems[index].checked = !cartItems[index].checked;
    
    // 检查是否全选
    const allChecked = cartItems.every(item => item.checked);
    
    this.setData({
      cartItems: cartItems,
      allChecked: allChecked
    });
    
    this.calculateTotal();
  },

  // 切换全选状态
  onToggleAllCheck() {
    const allChecked = !this.data.allChecked;
    const cartItems = this.data.cartItems.map(item => {
      return {
        ...item,
        checked: allChecked
      };
    });
    
    this.setData({
      allChecked: allChecked,
      cartItems: cartItems
    });
    
    this.calculateTotal();
  },

  // 切换编辑模式
  onToggleEditMode() {
    this.setData({
      isEditing: !this.data.isEditing
    });
  },

  // 去结算
  onCheckout() {
    if (this.data.totalCount === 0) {
      wx.showToast({
        title: '请选择要结算的商品',
        icon: 'none'
      });
      return;
    }
    
    // 这里可以跳转到结算页面
    wx.navigateTo({
      url: '/pages/checkout/checkout'
    });
  },

  // 添加备注
  onAddRemark() {
    wx.navigateTo({
      url: '/pages/remark/remark'
    });
  }
}) 