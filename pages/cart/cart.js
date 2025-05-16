// pages/cart/cart.js
const app = getApp();
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    isLoading: true,
    cartItems: [],
    selectedItems: [],
    totalPrice: 0,
    deliveryFee: 0,
    discount: 0,
    finalPrice: 0,
    editMode: false,
    allSelected: false
  },

  onLoad: function() {
    // 加载购物车数据
    this.getCartItems();
  },

  onShow: function() {
    if (!this.data.isLoading) {
      this.getCartItems();
    }
  },

  // 获取购物车商品
  getCartItems: function() {
    this.setData({ isLoading: true });
    
    // 检查登录状态
    if (!app.globalData.isLogin) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      });
      this.setData({ 
        isLoading: false,
        cartItems: []
      });
      return;
    }

    // 使用云函数获取购物车数据，这样可以包含完整的商品信息
    wx.cloud.callFunction({
      name: 'cartService',
      data: {
        action: 'getCart'
      }
    }).then(res => {
      console.log('获取购物车数据成功:', res);
      
      if (res.result && res.result.success) {
        const cartData = res.result.data || {};
        const cartItems = (cartData.cartItems || []).map(item => {
          return {
            _id: item._id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.product ? item.product.price : 0,
            name: item.product ? item.product.name : '未知商品',
            image: item.product ? item.product.image : '/assets/images/products/photo-1565299624946-b28f40a0ae38.jpeg',
            spec: item.product ? item.product.spec : '',
            stock: item.product ? (item.product.stock !== undefined ? item.product.stock : 0) : 0,
            checked: false
          };
        });
        
        this.setData({
          cartItems: cartItems,
          selectedItems: [],
          isLoading: false
        });
        
        this.calculateTotal();
      } else {
        this.setData({ 
          isLoading: false,
          cartItems: []
        });
        
        wx.showToast({
          title: '获取购物车数据失败',
          icon: 'none',
          duration: 2000
        });
      }
    }).catch(err => {
      console.error('获取购物车数据失败：', err);
      this.setData({ isLoading: false });
      wx.showToast({
        title: '获取购物车数据失败',
        icon: 'none',
        duration: 2000
      });
    });
  },

  // 切换编辑模式
  toggleEditMode: function() {
    const newEditMode = !this.data.editMode;
    this.setData({
      editMode: newEditMode
    });
  },

  // 选择/取消选择商品
  toggleItemSelect: function(e) {
    const index = e.currentTarget.dataset.index;
    const cartItems = this.data.cartItems;
    const item = cartItems[index];
    
    // 切换选中状态
    item.checked = !item.checked;
    
    // 更新选中的商品数组
    let selectedItems = this.data.selectedItems;
    if (item.checked) {
      selectedItems.push(item._id);
    } else {
      selectedItems = selectedItems.filter(id => id !== item._id);
    }
    
    // 检查是否全选
    const allSelected = cartItems.every(item => item.checked);
    
    this.setData({
      cartItems: cartItems,
      selectedItems: selectedItems,
      allSelected: allSelected
    });
    
    this.calculateTotal();
  },

  // 全选/取消全选
  toggleSelectAll: function() {
    const cartItems = this.data.cartItems;
    const allSelected = !this.data.allSelected;
    
    const newCartItems = cartItems.map(item => {
      return {
        ...item,
        checked: allSelected
      };
    });
    
    let selectedItems = [];
    if (allSelected) {
      selectedItems = newCartItems.map(item => item._id);
    }
    
    this.setData({
      cartItems: newCartItems,
      selectedItems: selectedItems,
      allSelected: allSelected
    });
    
    this.calculateTotal();
  },

  // 增加商品数量
  increaseQuantity: function(e) {
    const index = e.currentTarget.dataset.index;
    const cartItems = this.data.cartItems;
    const item = cartItems[index];
    
    // 检查是否超过库存
    if (item.quantity >= item.stock) {
      wx.showToast({
        title: '库存不足',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    item.quantity += 1;
    
    this.setData({
      cartItems: cartItems
    });
    
    this.updateCartItem(item);
    this.calculateTotal();
  },

  // 减少商品数量
  decreaseQuantity: function(e) {
    const index = e.currentTarget.dataset.index;
    const cartItems = this.data.cartItems;
    
    if (cartItems[index].quantity > 1) {
      cartItems[index].quantity -= 1;
      
      this.setData({
        cartItems: cartItems
      });
      
      this.updateCartItem(cartItems[index]);
      this.calculateTotal();
    }
  },

  // 更新购物车商品数量
  updateCartItem: function(item) {
    // 保存原始数量，用于在更新失败时恢复
    const originalQuantity = item.quantity;
    
    wx.cloud.callFunction({
      name: 'cartService',
      data: {
        action: 'updateCartItem',
        cartItemId: item._id,
        quantity: item.quantity
      }
    }).then(res => {
      console.log('购物车商品数量更新成功', res);
      
      // 检查返回的结果
      if (res.result && res.result.success) {
        // 更新购物车数量
        getApp().updateCart();
      } else {
        // 更新失败，恢复原始数量
        const cartItems = this.data.cartItems;
        const itemIndex = cartItems.findIndex(i => i._id === item._id);
        
        if (itemIndex !== -1) {
          cartItems[itemIndex].quantity = originalQuantity;
          this.setData({ cartItems });
          this.calculateTotal();
        }
        
        // 显示错误信息
        wx.showToast({
          title: res.result.message || '更新失败，请重试',
          icon: 'none',
          duration: 2000
        });
      }
    }).catch(err => {
      console.error('更新失败：', err);
      
      // 更新失败，恢复原始数量
      const cartItems = this.data.cartItems;
      const itemIndex = cartItems.findIndex(i => i._id === item._id);
      
      if (itemIndex !== -1) {
        cartItems[itemIndex].quantity = originalQuantity;
        this.setData({ cartItems });
        this.calculateTotal();
      }
      
      wx.showToast({
        title: '更新失败，请重试',
        icon: 'none',
        duration: 2000
      });
    });
  },

  // 删除选中的商品
  deleteSelectedItems: function() {
    const selectedItems = this.data.selectedItems;
    
    if (selectedItems.length === 0) {
      wx.showToast({
        title: '请选择要删除的商品',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    wx.showModal({
      title: '提示',
      content: '确定要删除选中的商品吗？',
      success: res => {
        if (res.confirm) {
          wx.showLoading({
            title: '删除中...'
          });
          
          // 逐个删除选中商品
          const deletePromises = selectedItems.map(itemId => {
            return wx.cloud.callFunction({
              name: 'cartService',
              data: {
                action: 'removeCartItem',
                cartItemId: itemId
              }
            });
          });
          
          Promise.all(deletePromises)
            .then(() => {
              wx.hideLoading();
              // 更新购物车数量
              getApp().updateCart();
              wx.showToast({
                title: '删除成功',
                icon: 'success',
                duration: 2000
              });
              
              // 重新获取购物车数据
              this.getCartItems();
            })
            .catch(err => {
              wx.hideLoading();
              console.error('批量删除失败：', err);
              wx.showToast({
                title: '删除失败，请重试',
                icon: 'none',
                duration: 2000
              });
            });
        }
      }
    });
  },

  // 删除单个商品
  deleteItem: function(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '提示',
      content: '确定要删除该商品吗？',
      success: res => {
        if (res.confirm) {
          wx.showLoading({
            title: '删除中...'
          });
          
          wx.cloud.callFunction({
            name: 'cartService',
            data: {
              action: 'removeCartItem',
              cartItemId: id
            }
          }).then(res => {
            wx.hideLoading();
            
            if (res.result && res.result.success) {
              // 更新购物车数量
              getApp().updateCart();
              wx.showToast({
                title: '删除成功',
                icon: 'success',
                duration: 2000
              });
              
              // 更新购物车数据
              this.getCartItems();
            } else {
              wx.showToast({
                title: '删除失败，请重试',
                icon: 'none',
                duration: 2000
              });
            }
          }).catch(err => {
            wx.hideLoading();
            console.error('删除失败：', err);
            wx.showToast({
              title: '删除失败，请重试',
              icon: 'none',
              duration: 2000
            });
          });
        }
      }
    });
  },

  // 计算总价
  calculateTotal: function() {
    const cartItems = this.data.cartItems;
    let totalPrice = 0;
    
    cartItems.forEach(item => {
      if (item.checked) {
        totalPrice += item.price * item.quantity;
      }
    });
    
    // 计算配送费和折扣（这里只是示例，实际逻辑根据业务需求调整）
    const deliveryFee = totalPrice > 0 ? 5 : 0; // 有商品时配送费为5元
    const discount = totalPrice >= 100 ? 10 : 0; // 满100减10
    const finalPrice = totalPrice + deliveryFee - discount;
    
    this.setData({
      totalPrice: totalPrice.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      discount: discount.toFixed(2),
      finalPrice: finalPrice.toFixed(2)
    });
  },

  // 前往结算
  goToCheckout: function() {
    const selectedItems = this.data.selectedItems;
    
    if (selectedItems.length === 0) {
      wx.showToast({
        title: '请选择要结算的商品',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 获取选中的商品
    const selectedCartItems = this.data.cartItems.filter(item => item.checked);
    
    // 整理商品数据，确保结构完整
    const formattedItems = selectedCartItems.map(item => ({
      _id: item._id,
      productId: item.productId,
      name: item.name,
      image: item.image,
      price: item.price,
      quantity: item.quantity,
      spec: item.spec,
      stock: item.stock
    }));
    
    // 准备结算数据
    const checkoutData = {
      items: formattedItems,
      totalPrice: this.data.totalPrice,
      deliveryFee: this.data.deliveryFee,
      discount: this.data.discount,
      finalPrice: this.data.finalPrice
    };
    
    console.log('结算数据摘要:', {
      商品数: formattedItems.length,
      总价: checkoutData.totalPrice
    });
    
    // 将结算数据存储到缓存中
    try {
      // 完整结算数据存储
      wx.setStorageSync('checkoutData', checkoutData);
      console.log('成功保存结算数据到缓存');
    } catch (error) {
      console.error('保存结算数据到缓存失败：', error);
      wx.showToast({
        title: '准备结算数据失败',
        icon: 'none'
      });
      return;
    }
    
    // 跳转到结算页面
    try {
      // 使用redirectTo而不是navigateTo，避免页面栈的问题
      wx.redirectTo({
        url: '/pages/checkout/checkout?timestamp=' + new Date().getTime(),
        success: function() {
          console.log('成功跳转到结算页面');
        },
        fail: function(err) {
          console.error('跳转到结算页面失败：', err);
          wx.showToast({
            title: '跳转失败，请重试',
            icon: 'none'
          });
        }
      });
    } catch (error) {
      console.error('跳转过程中发生异常：', error);
      wx.showToast({
        title: '跳转异常，请重试',
        icon: 'none'
      });
    }
  },

  // 阻止穿透滑动
  preventTouchMove: function() {
    return false;
  },

  // 跳转到商品详情页
  goToProductDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/product/product?id=' + id
    });
  },

  // 去首页购物
  goShopping: function() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
}); 