// pages/category/category.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    currentTab: 'all',
    productList: [],
    categories: [],
    loading: true,
    loadingProducts: true
  },

  /**
   * 切换分类标签
   */
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    console.log('切换到分类:', tab); // 添加调试信息
    
    this.setData({
      currentTab: tab,
      loadingProducts: true
    });
    
    // 根据选中的标签获取对应的商品数据
    this.fetchProductsByCategory(tab);
  },

  /**
   * 点击商品进入详情页
   */
  navigateToDetail(e) {
    const productId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/product/product?id=${productId}`
    });
  },
  
  /**
   * 添加到购物车
   */
  addToCart(e) {
    const productId = e.currentTarget.dataset.id;
    
    wx.cloud.callFunction({
      name: 'cartService',
      data: {
        action: 'addToCart',
        productId
      }
    }).then(res => {
      if (res.result.success) {
        // 更新购物车数量
        getApp().updateCart();
        wx.showToast({
          title: '已添加到购物车',
          icon: 'success',
          duration: 2000
        });
      } else {
        wx.showToast({
          title: res.result.message || '添加失败',
          icon: 'none',
          duration: 2000
        });
      }
    }).catch(err => {
      console.error('添加商品到购物车失败:', err);
      wx.showToast({
        title: '添加失败，请重试',
        icon: 'none',
        duration: 2000
      });
    });
  },

  /**
   * 从云数据库获取分类列表
   */
  fetchCategories() {
    // 首先将loading设置为true
    this.setData({ loading: true });
    
    wx.cloud.callFunction({
      name: 'getCategories',
      data: {
        onlyActive: true
      }
    }).then(res => {
      if (res.result && res.result.success) {
        // 添加去重逻辑
        let categoriesData = res.result.data || [];
        console.log('获取到的分类数据:', categoriesData);
        
        // 确保数据格式正确
        if (!Array.isArray(categoriesData)) {
          console.error('分类数据格式错误，不是数组:', categoriesData);
          categoriesData = [];
        }
        
        // 过滤无效数据
        categoriesData = categoriesData.filter(category => {
          return category && category.name && typeof category.name === 'string';
        });
        
        // 收集所有需要获取临时URL的云存储图片
        const cloudFileIDs = [];
        categoriesData.forEach(category => {
          if (category.image && category.image.startsWith('cloud://')) {
            cloudFileIDs.push(category.image);
          }
        });
        
        // 如果有云存储图片，获取临时URL
        if (cloudFileIDs.length > 0) {
          console.log('获取分类图片临时URL:', cloudFileIDs);
          wx.cloud.getTempFileURL({
            fileList: cloudFileIDs,
            success: res => {
              console.log('获取临时文件链接成功', res);
              
              // 创建fileID到tempFileURL的映射
              const fileUrlMap = {};
              if (res.fileList) {
                res.fileList.forEach(item => {
                  if (item.fileID && item.tempFileURL) {
                    fileUrlMap[item.fileID] = item.tempFileURL;
                  }
                });
              }
              
              // 处理分类数据，更新图片URL
              this.processCategoriesData(categoriesData, fileUrlMap);
            },
            fail: err => {
              console.error('获取临时文件链接失败', err);
              // 即使失败也继续处理数据
              this.processCategoriesData(categoriesData, {});
            }
          });
        } else {
          // 没有云存储图片，直接处理数据
          this.processCategoriesData(categoriesData, {});
        }
      } else {
        console.error('获取分类数据失败或返回格式错误:', res);
        // 使用默认分类
        this.setData({ 
          categories: this.getDefaultCategories(),
          loading: false 
        });
      }
    }).catch(err => {
      console.error('获取分类数据失败:', err);
      // 使用默认分类
      this.setData({ 
        categories: this.getDefaultCategories(),
        loading: false 
      });
    });
  },
  
  /**
   * 处理分类数据并更新状态
   * @param {Array} categoriesData - 分类数据数组
   * @param {Object} fileUrlMap - 文件ID到临时URL的映射
   */
  processCategoriesData(categoriesData, fileUrlMap) {
    // 使用Map去重，以分类名称为key
    const uniqueCategories = new Map();
    
    categoriesData.forEach(category => {
      if (!uniqueCategories.has(category.name)) {
        // 处理图片路径
        if (category.image) {
          // 如果是云存储链接且有对应的临时URL，使用临时URL
          if (category.image.startsWith('cloud://') && fileUrlMap[category.image]) {
            category.image = fileUrlMap[category.image];
            console.log(`分类 "${category.name}" 更新云存储图片URL:`, category.image);
            
            // 将图片URL保存到本地缓存，以备重启小程序时使用
            const cacheKey = `category_image_${category._id || category.id || category.name}`;
            wx.setStorageSync(cacheKey, category.image);
          } 
          // 尝试从缓存中获取图片
          else if (category.image.startsWith('cloud://')) {
            const cacheKey = `category_image_${category._id || category.id || category.name}`;
            const cachedImage = wx.getStorageSync(cacheKey);
            if (cachedImage) {
              category.image = cachedImage;
              console.log(`分类 "${category.name}" 使用缓存图片:`, category.image);
            }
          }
          
          // 为前端显示设置icon字段
          category.icon = category.image;
          console.log(`分类 "${category.name}" 使用图片:`, category.icon);
        } else if (!category.icon) {
          // 如果没有图片，使用默认图标
          category.icon = this.getDefaultIconForCategory(category.name);
          console.log(`分类 "${category.name}" 使用默认图标:`, category.icon);
        }
        
        // 确保productCount为数字类型，不再使用随机值
        if (category.productCount === undefined || category.productCount === null) {
          category.productCount = 0;
          console.log(`分类 "${category.name}" 设置商品数量为0`);
        }
        
        uniqueCategories.set(category.name, category);
      }
    });
    
    // 转换回数组
    let uniqueCategoriesArray = Array.from(uniqueCategories.values());
    
    // 如果没有分类数据，使用默认分类
    if (uniqueCategoriesArray.length === 0) {
      uniqueCategoriesArray = this.getDefaultCategories();
      console.log('使用默认分类数据');
    }
    
    console.log('最终分类数据:', uniqueCategoriesArray);
    
    // 更新状态
    this.setData({
      categories: uniqueCategoriesArray,
      loading: false
    });
    
    // 预加载分类图片
    this.preloadCategoryImages(uniqueCategoriesArray);
  },
  
  /**
   * 预加载分类图片
   */
  preloadCategoryImages(categories) {
    categories.forEach(category => {
      if (category.icon && !category.icon.startsWith('/assets/')) {
        wx.getImageInfo({
          src: category.icon,
          success(res) {
            console.log(`预加载分类图片成功: ${category.name}`, res.width, res.height);
          },
          fail(err) {
            console.error(`预加载分类图片失败: ${category.name}`, err);
          }
        });
      }
    });
  },
  
  /**
   * 获取默认分类数据
   */
  getDefaultCategories() {
    return [
      { name: '蛋糕', icon: '/assets/images/categories/cake.jpg', productCount: 0 },
      { name: '面包', icon: '/assets/images/categories/bread.jpg', productCount: 0 },
      { name: '甜点', icon: '/assets/images/categories/dessert.jpg', productCount: 0 },
      { name: '饼干', icon: '/assets/images/categories/cookies.jpg', productCount: 0 }
    ];
  },
  
  /**
   * 根据分类名称获取默认图标
   */
  getDefaultIconForCategory(categoryName) {
    const defaultIcons = {
      '蛋糕': '/assets/images/categories/cake.jpg',
      '面包': '/assets/images/categories/bread.jpg',
      '甜点': '/assets/images/categories/dessert.jpg',
      '饼干': '/assets/images/categories/cookies.jpg',
      '咖啡': '/assets/images/categories/coffee.jpg',
      '茶': '/assets/images/categories/tea.jpg'
    };
    
    return defaultIcons[categoryName] || '/assets/images/categories/default.jpg';
  },

  /**
   * 根据分类获取商品列表
   */
  fetchProductsByCategory(categoryId) {
    // 添加调试信息
    console.log('通过分类获取商品, 分类名称:', categoryId);
    
    // 准备查询参数
    const queryParams = {
      onlyActive: true
    };
    
    // 如果不是全部分类，则添加分类名称条件
    if (categoryId !== 'all') {
      queryParams.categoryName = categoryId;
    }
    
    console.log('查询参数:', queryParams);
    
    // 显示加载状态
    this.setData({ loadingProducts: true });
    
    // 在发送请求前先清空产品列表，避免看到旧数据
    this.setData({
      productList: []
    });
    
    // categoryId 为 'all' 时获取全部商品
    wx.cloud.callFunction({
      name: 'getproducts',
      data: queryParams
    }).then(res => {
      console.log('获取商品结果:', res);
      
      if (res.result && res.result.success) {
        // 添加去重逻辑
        let productsData = res.result.data || [];
        console.log('获取到的商品数据数量:', productsData.length);
        
        // 第一步：为每个产品创建一个唯一的标识符，避免后端重复数据
        productsData = productsData.map(product => {
          // 确保所有产品有唯一ID
          if (!product._id) {
            product._id = `temp_${Math.random().toString(36).substring(2, 15)}`;
          }
          // 添加显示序号，以便调试
          product._index = productsData.indexOf(product) + 1;
          return product;
        });
        
        // 如果不是获取全部商品，再次确认商品分类是否匹配
        // 这是为了解决云函数中可能存在的分类筛选问题
        if (categoryId !== 'all') {
          // 找出数据中使用的分类字段
          const categoryFields = ['category', 'categoryName', 'type', 'productType'];
          console.log('检查分类字段...');
          
          // 客户端再次过滤
          const filteredProducts = productsData.filter(product => {
            // 检查所有可能存在的分类字段
            for (const field of categoryFields) {
              if (product[field] && (
                  product[field] === categoryId || 
                  (Array.isArray(product[field]) && product[field].includes(categoryId))
                )) {
                console.log(`找到匹配分类(${field}):`, product.name);
                return true;
              }
            }
            // 如果没有匹配的分类字段，则尝试模糊匹配
            if (product.name && product.name.includes(categoryId)) {
              console.log('通过名称匹配产品:', product.name);
              return true;
            }
            if (product.description && product.description.includes(categoryId)) {
              console.log('通过描述匹配产品:', product.name);
              return true;
            }
            return false;
          });
          
          console.log('客户端过滤后的商品数量:', filteredProducts.length);
          
          // 如果客户端过滤有结果，使用过滤后的结果，否则保留原始结果
          if (filteredProducts.length > 0) {
            productsData = filteredProducts;
          }
        }
        
        // 使用Map去重，以商品ID为key
        const uniqueProducts = new Map();
        
        // 第一轮去重：按_id去重
        productsData.forEach(product => {
          if (!uniqueProducts.has(product._id)) {
            uniqueProducts.set(product._id, product);
          }
        });
        
        // 第二轮去重：按商品名称和价格组合去重
        const nameAndPriceSet = new Set();
        let finalProducts = [];
        
        uniqueProducts.forEach(product => {
          const nameAndPrice = `${product.name}-${product.price}`;
          
          if (!nameAndPriceSet.has(nameAndPrice)) {
            nameAndPriceSet.add(nameAndPrice);
            finalProducts.push(product);
          } else {
            console.log('去除重复商品:', product.name, product.price);
          }
        });
        
        console.log('最终去重后的商品数量:', finalProducts.length);
        console.log('最终商品列表:', finalProducts);
        
        // 确保显示时商品列表不为空
        if (finalProducts.length === 0 && categoryId === 'all') {
          // 如果是全部分类且没有商品，显示测试数据
          finalProducts = this.getTestProducts();
          console.log('使用测试商品数据');
        }
        
        this.setData({
          productList: finalProducts,
          loadingProducts: false
        });
      } else {
        console.error('获取商品失败或返回数据格式错误:', res);
        wx.showToast({
          title: '获取商品数据失败',
          icon: 'none',
          duration: 2000
        });
        this.setData({ 
          loadingProducts: false,
          productList: categoryId === 'all' ? this.getTestProducts() : []
        });
      }
    }).catch(err => {
      console.error('获取商品数据失败:', err);
      wx.showToast({
        title: '获取商品数据失败',
        icon: 'none',
        duration: 2000
      });
      this.setData({ 
        loadingProducts: false,
        productList: categoryId === 'all' ? this.getTestProducts() : []
      });
    });
  },

  /**
   * 获取测试商品数据
   */
  getTestProducts() {
    return [];
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 初始化云环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-3g9nsaj9f3a1b0ed',
        traceUser: true,
      });
      
      // 获取分类数据
      this.fetchCategories();
      
      // 获取全部商品数据（初始加载状态）
      this.fetchProductsByCategory('all');
      
      // 设置加载超时处理，确保页面不会永远停留在加载状态
      setTimeout(() => {
        if (this.data.loading || this.data.loadingProducts) {
          console.log('加载超时，强制结束加载状态');
          this.setData({
            loading: false,
            loadingProducts: false
          });
          
          // 如果分类列表为空，添加默认分类
          if (this.data.categories.length === 0) {
            this.setData({
              categories: [
                { name: '蛋糕', icon: '/assets/images/categories/cake.jpg', productCount: 10 },
                { name: '面包', icon: '/assets/images/categories/bread.jpg', productCount: 8 },
                { name: '甜点', icon: '/assets/images/categories/dessert.jpg', productCount: 12 },
                { name: '饼干', icon: '/assets/images/categories/cookies.jpg', productCount: 6 }
              ]
            });
          }
        }
      }, 10000); // 10秒后超时
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    // 下拉刷新时，重新获取商品数据
    this.fetchCategories();
    this.fetchProductsByCategory(this.data.currentTab);
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    // 如果需要实现分页加载，可以在这里实现
    console.log('加载更多商品');
  }
}) 