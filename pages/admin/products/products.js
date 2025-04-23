Page({
  /**
   * 页面的初始数据
   */
  data: {
    products: [
      {
        id: 1,
        name: '草莓奶油蛋糕',
        image: '/assets/images/products/product-tiramisu.jpg',
        price: 158,
        spec: '6寸',
        stock: 15,
        category: '蛋糕',
        isActive: true,
        isHot: true
      },
      {
        id: 2,
        name: '巧克力曲奇',
        image: '/assets/images/products/product-brownie.jpg',
        price: 28,
        spec: '200g/盒',
        stock: 3,
        category: '饼干',
        isActive: false,
        isHot: false
      },
      {
        id: 3,
        name: '法式可颂',
        image: '/assets/images/products/product-croissant.jpg',
        price: 32,
        spec: '4个/份',
        stock: 25,
        category: '面包',
        isActive: true,
        isHot: false
      },
      {
        id: 4,
        name: '拿铁咖啡',
        image: '/assets/images/products/photo-1499636136210-6f4ee915583e.jpeg',
        price: 22,
        spec: '中杯',
        stock: 0,
        category: '咖啡',
        isActive: false,
        isHot: true
      },
      {
        id: 5,
        name: '抹茶慕斯',
        image: '/assets/images/products/product-matcha-cake.jpg',
        price: 38,
        spec: '4寸',
        stock: 12,
        category: '蛋糕',
        isActive: true,
        isHot: false
      },
      {
        id: 6,
        name: '全麦吐司',
        image: '/assets/images/products/product-cream-puff.jpg',
        price: 18,
        spec: '400g/条',
        stock: 8,
        category: '面包',
        isActive: true,
        isHot: false
      }
    ],
    filteredProducts: [],
    showAddForm: false,
    showEditForm: false,
    currentProduct: null,
    categories: ['蛋糕', '面包', '饼干', '咖啡'],
    currentCategory: 'all',
    searchKeyword: '',
    newProduct: {
      name: '',
      price: '',
      spec: '',
      stock: '',
      category: '蛋糕',
      isActive: true,
      isHot: false
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.log("商品管理页面加载");
    
    try {
      // 检查管理员登录状态
      this.checkAdminAuth();
      
      // 获取商品数据
      this.getProductsData();
      
      // 确保初始化过滤后的商品列表
      if (this.data.products && this.data.products.length > 0) {
        console.log("从products初始化filteredProducts");
        this.setData({
          filteredProducts: this.data.products
        });
      } else {
        console.warn("products为空，使用备用数据");
        // 如果商品数据为空，使用备用数据
        this.setData({
          products: this.getBackupProductsData(),
          filteredProducts: this.getBackupProductsData()
        });
      }
      
      console.log("过滤后商品列表:", this.data.filteredProducts);
    } catch (error) {
      console.error("onLoad错误:", error);
      wx.showToast({
        title: '加载数据失败',
        icon: 'none'
      });
    }
    
    wx.hideTabBar();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    wx.hideTabBar();
  },

  /**
   * 检查管理员登录状态
   */
  checkAdminAuth: function() {
    const isAdminLoggedIn = wx.getStorageSync('adminLoggedIn');
    console.log("管理员登录状态:", isAdminLoggedIn);
    
    // 临时注释掉跳转，以便调试商品列表
    // if (!isAdminLoggedIn) {
    //   wx.redirectTo({
    //     url: '/pages/admin/login/login'
    //   });
    // }
    
    // 为了测试，临时设置管理员登录状态
    wx.setStorageSync('adminLoggedIn', true);
  },

  /**
   * 获取商品数据
   */
  getProductsData: function() {
    // 模拟从服务器获取数据的过程
    wx.showLoading({
      title: '加载中',
    });
    
    setTimeout(() => {
      wx.hideLoading();
      // 实际应用中，这里应该调用API获取商品数据
    }, 500);
  },

  /**
   * 搜索输入处理
   */
  onSearchInput: function(e) {
    this.setData({
      searchKeyword: e.detail.value
    }, () => {
      this.filterProducts();
    });
  },

  /**
   * 切换分类
   */
  switchCategory: function(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      currentCategory: category
    }, () => {
      this.filterProducts();
    });
  },

  /**
   * 过滤商品
   */
  filterProducts: function() {
    const { products, currentCategory, searchKeyword } = this.data;
    
    console.log("过滤前商品数量:", products.length);
    console.log("当前分类:", currentCategory);
    console.log("搜索关键词:", searchKeyword);
    
    let filtered = [...products];
    
    // 按分类过滤
    if (currentCategory !== 'all') {
      filtered = filtered.filter(p => p.category === currentCategory);
    }
    
    // 按关键词搜索
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(keyword) || 
        p.category.toLowerCase().includes(keyword)
      );
    }
    
    console.log("过滤后商品数量:", filtered.length);
    
    this.setData({
      filteredProducts: filtered
    });
    
    console.log("设置filteredProducts后:", this.data.filteredProducts.length);
  },

  /**
   * 打开添加商品表单
   */
  showAddProductForm: function() {
    this.setData({
      showAddForm: true,
      newProduct: {
        name: '',
        price: '',
        spec: '',
        stock: '',
        category: '蛋糕',
        isActive: true,
        isHot: false
      }
    });
  },

  /**
   * 关闭添加商品表单
   */
  closeAddProductForm: function() {
    this.setData({
      showAddForm: false
    });
  },

  /**
   * 提交添加商品表单
   */
  submitAddProduct: function() {
    const { newProduct } = this.data;
    
    // 简单的表单验证
    if (!newProduct.name) {
      wx.showToast({
        title: '请输入商品名称',
        icon: 'none'
      });
      return;
    }
    
    if (!newProduct.price) {
      wx.showToast({
        title: '请输入商品价格',
        icon: 'none'
      });
      return;
    }
    
    // 模拟添加商品到服务器
    wx.showLoading({
      title: '添加中',
    });
    
    setTimeout(() => {
      // 模拟添加成功
      const products = this.data.products;
      // 生成一个新的ID（真实环境中应由服务器生成）
      const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
      
      // 创建新商品对象
      const productToAdd = {
        ...newProduct,
        id: newId,
        price: parseFloat(newProduct.price),
        stock: parseInt(newProduct.stock) || 0,
        image: '/assets/images/products/photo-1565299624946-b28f40a0ae38.jpeg' // 默认图片
      };
      
      // 添加到数组
      products.unshift(productToAdd);
      
      this.setData({
        products,
        showAddForm: false
      }, () => {
        this.filterProducts();
      });
      
      wx.hideLoading();
      wx.showToast({
        title: '添加成功',
        icon: 'success'
      });
    }, 1000);
  },

  /**
   * 打开编辑商品表单
   */
  showEditProductForm: function(e) {
    const id = e.currentTarget.dataset.id;
    const product = this.data.products.find(p => p.id === id);
    
    if (product) {
      this.setData({
        currentProduct: { ...product },
        showEditForm: true
      });
    }
  },

  /**
   * 关闭编辑商品表单
   */
  closeEditProductForm: function() {
    this.setData({
      showEditForm: false,
      currentProduct: null
    });
  },

  /**
   * 提交编辑商品表单
   */
  submitEditProduct: function() {
    const { currentProduct, products } = this.data;
    
    // 简单的表单验证
    if (!currentProduct.name) {
      wx.showToast({
        title: '请输入商品名称',
        icon: 'none'
      });
      return;
    }
    
    if (!currentProduct.price) {
      wx.showToast({
        title: '请输入商品价格',
        icon: 'none'
      });
      return;
    }
    
    // 模拟更新商品到服务器
    wx.showLoading({
      title: '更新中',
    });
    
    setTimeout(() => {
      // 更新商品列表
      const updatedProducts = products.map(p => {
        if (p.id === currentProduct.id) {
          return {
            ...currentProduct,
            price: parseFloat(currentProduct.price),
            stock: parseInt(currentProduct.stock) || 0
          };
        }
        return p;
      });
      
      this.setData({
        products: updatedProducts,
        showEditForm: false,
        currentProduct: null
      }, () => {
        this.filterProducts();
      });
      
      wx.hideLoading();
      wx.showToast({
        title: '更新成功',
        icon: 'success'
      });
    }, 1000);
  },

  /**
   * 输入框变更处理（新增商品）
   */
  onNewProductInput: function(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`newProduct.${field}`]: value
    });
  },

  /**
   * 输入框变更处理（编辑商品）
   */
  onEditProductInput: function(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`currentProduct.${field}`]: value
    });
  },

  /**
   * 切换开关变更处理（新增商品）
   */
  onNewProductSwitchChange: function(e) {
    const { value } = e.detail;
    
    this.setData({
      'newProduct.isActive': value
    });
  },

  /**
   * 切换热门状态开关（新增商品）
   */
  onNewProductHotChange: function(e) {
    const { value } = e.detail;
    
    this.setData({
      'newProduct.isHot': value
    });
  },

  /**
   * 切换开关变更处理（编辑商品）
   */
  onEditProductSwitchChange: function(e) {
    const { value } = e.detail;
    
    this.setData({
      'currentProduct.isActive': value
    });
  },

  /**
   * 切换热门状态开关（编辑商品）
   */
  onEditProductHotChange: function(e) {
    const { value } = e.detail;
    
    this.setData({
      'currentProduct.isHot': value
    });
  },

  /**
   * 选择器变更处理（新增商品）
   */
  onNewProductPickerChange: function(e) {
    const { value } = e.detail;
    const { categories } = this.data;
    
    this.setData({
      'newProduct.category': categories[value]
    });
  },

  /**
   * 选择器变更处理（编辑商品）
   */
  onEditProductPickerChange: function(e) {
    const { value } = e.detail;
    const { categories } = this.data;
    
    this.setData({
      'currentProduct.category': categories[value]
    });
  },

  /**
   * 切换底部标签页
   */
  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab;
    
    // 根据点击的标签进行页面跳转
    switch (tab) {
      case 'dashboard':
        wx.redirectTo({
          url: '/pages/admin/dashboard/dashboard',
        });
        break;
      case 'products':
        // 已经在商品页面，不做跳转
        break;
      case 'categories':
        wx.redirectTo({
          url: '/pages/admin/categories/categories',
        });
        break;
      case 'orders':
        wx.redirectTo({
          url: '/pages/admin/orders/orders',
        });
        break;
      case 'users':
        wx.redirectTo({
          url: '/pages/admin/users/users',
        });
        break;
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function() {
    console.log("商品页面渲染完成");
    // 再次确认过滤后的商品列表已正确设置
    if (this.data.filteredProducts.length === 0 && this.data.products.length > 0) {
      console.log("修复：重新设置过滤商品列表");
      this.setData({
        filteredProducts: this.data.products
      });
    }
  },

  // 添加备用商品数据
  getBackupProductsData: function() {
    return [
      {
        id: 1,
        name: '草莓奶油蛋糕',
        image: '/assets/images/products/product-tiramisu.jpg',
        price: 158,
        spec: '6寸',
        stock: 15,
        category: '蛋糕',
        isActive: true,
        isHot: true
      },
      {
        id: 2,
        name: '巧克力曲奇',
        image: '/assets/images/products/product-brownie.jpg',
        price: 28,
        spec: '200g/盒',
        stock: 3,
        category: '饼干',
        isActive: false,
        isHot: false
      }
    ];
  }
}) 