// search.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    keyword: '',
    searchResults: [],
    loading: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    if (options.keyword) {
      const keyword = decodeURIComponent(options.keyword) || '';
      this.setData({
        keyword
      });
      
      // 执行搜索
      if (keyword.trim() !== '') {
        this.doSearch();
      }
    }
  },

  /**
   * 处理搜索框输入
   */
  onSearchInput: function(e) {
    this.setData({
      keyword: e.detail.value
    });
  },

  /**
   * 清除搜索框内容
   */
  clearSearch: function() {
    this.setData({
      keyword: '',
      searchResults: []
    });
  },

  /**
   * 执行搜索
   */
  doSearch: function() {
    const { keyword } = this.data;
    
    if (!keyword || keyword.trim() === '') {
      return;
    }
    
    this.setData({
      loading: true,
      searchResults: []
    });
    
    // 调用云函数搜索商品
    wx.cloud.callFunction({
      name: 'getproducts',
      data: {
        keyword: keyword,
        onlyActive: true,
        pageSize: 50
      }
    }).then(res => {
      console.log('搜索结果:', res);
      
      if (res.result && res.result.success) {
        // 处理商品图片
        const products = res.result.data || [];
        
        // 处理云存储图片链接
        this.processProductImages(products);
        
        // 更新搜索结果
        this.setData({
          searchResults: products,
          loading: false
        });
      } else {
        this.setData({
          loading: false
        });
        wx.showToast({
          title: '搜索失败，请重试',
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('搜索失败:', err);
      this.setData({
        loading: false
      });
      wx.showToast({
        title: '搜索失败，请重试',
        icon: 'none'
      });
    });
  },

  /**
   * 处理商品图片
   */
  processProductImages: function(products) {
    // 收集所有需要转换的云存储图片ID
    const cloudFileIDs = [];
    products.forEach((product, index) => {
      if (product.image && product.image.startsWith('cloud://')) {
        cloudFileIDs.push(product.image);
      }
    });
    
    if (cloudFileIDs.length > 0) {
      // 获取临时文件链接
      wx.cloud.getTempFileURL({
        fileList: cloudFileIDs,
        success: res => {
          if (res.fileList && res.fileList.length > 0) {
            const searchResults = this.data.searchResults;
            
            // 创建一个映射，用于快速查找文件ID对应的临时URL
            const tempURLMap = {};
            res.fileList.forEach(file => {
              tempURLMap[file.fileID] = file.tempFileURL;
            });
            
            // 更新商品图片链接
            for (let i = 0; i < searchResults.length; i++) {
              const fileID = searchResults[i].image;
              if (fileID && tempURLMap[fileID]) {
                searchResults[i].image = tempURLMap[fileID];
              }
            }
            
            // 更新页面数据
            this.setData({
              searchResults
            });
          }
        }
      });
    }
  },

  /**
   * 跳转到商品详情页
   */
  goToProductDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/product/product?id=${id}`
    });
  },

  /**
   * 添加商品到购物车
   */
  addToCart: function(e) {
    // 阻止事件冒泡，防止同时触发商品详情跳转
    e.stopPropagation();
    
    const id = e.currentTarget.dataset.id;
    const product = this.data.searchResults.find(item => item._id === id);
    
    if (!product) {
      return;
    }
    
    // 检查库存
    if (product.stock <= 0) {
      wx.showToast({
        title: '商品库存不足',
        icon: 'none'
      });
      return;
    }
    
    // 从本地存储获取购物车数据
    const cartItems = wx.getStorageSync('cartItems') || [];
    
    // 检查商品是否已在购物车中
    const existingItemIndex = cartItems.findIndex(item => item._id === id);
    
    if (existingItemIndex !== -1) {
      // 商品已存在，增加数量
      cartItems[existingItemIndex].quantity += 1;
    } else {
      // 商品不存在，添加到购物车
      cartItems.push({
        _id: product._id,
        name: product.name,
        price: product.price,
        spec: product.spec,
        image: product.image,
        quantity: 1,
        selected: true
      });
    }
    
    // 保存到本地存储
    wx.setStorageSync('cartItems', cartItems);
    
    // 显示添加成功提示
    wx.showToast({
      title: '已加入购物车',
      icon: 'success'
    });
  },

  /**
   * 返回上一页
   */
  goBack: function() {
    wx.navigateBack();
  }
}) 