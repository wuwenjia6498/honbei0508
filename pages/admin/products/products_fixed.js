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
        isHot: true,
        isNew: false,
        description: '采用进口奶油制作，搭配新鲜草莓，口感细腻丰富。',
        ingredients: '奶油、草莓、小麦粉、鸡蛋、糖',
        calories: 320,
        shelfLife: '建议24小时内食用',
        storage: '0-4°C冷藏保存',
        bakingTime: '今日上午制作',
        options: [
          { name: '巧克力装饰', price: 10 },
          { name: '生日牌', price: 5 }
        ]
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
        isHot: false,
        isNew: false,
        description: '比利时巧克力制作，浓郁香甜',
        ingredients: '巧克力、小麦粉、鸡蛋、糖、黄油',
        calories: 450,
        shelfLife: '保质期7天',
        storage: '常温密封保存',
        bakingTime: '今日制作',
        options: []
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
      isHot: false,
      isNew: false,
      description: '',
      ingredients: '',
      calories: '',
      shelfLife: '',
      storage: '',
      bakingTime: '',
      options: []
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
        isHot: false,
        isNew: false,
        description: '',
        ingredients: '',
        calories: '',
        shelfLife: '',
        storage: '',
        bakingTime: '',
        options: []
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
   * 为新商品选择图片
   */
  chooseNewProductImage: function() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 获取选中图片的临时路径
        const tempFilePath = res.tempFilePaths[0];
        
        // 更新数据，显示预览图
        this.setData({
          'newProduct.tempImage': tempFilePath
        });
        
        wx.showToast({
          title: '图片选择成功',
          icon: 'success'
        });
      }
    });
  },
  
  /**
   * 移除新商品图片
   */
  removeNewProductImage: function() {
    // 获取当前临时图片路径
    const tempImage = this.data.newProduct.tempImage;
    
    // 清理临时文件
    this.removeTempFile(tempImage);
    
    // 更新状态
    this.setData({
      'newProduct.tempImage': ''
    });
  },
  
  /**
   * 清理缓存文件
   */
  removeTempFile: function(filePath) {
    if (filePath && filePath.startsWith('wxfile://')) {
      wx.removeSavedFile({
        filePath: filePath,
        fail: function() {
          console.log('删除临时文件失败', filePath);
        }
      });
    }
  },

  /**
   * 上传图片到服务器
   * 实际项目中，应该上传到云存储或服务器
   */
  uploadProductImage: function(tempFilePath) {
    return new Promise((resolve, reject) => {
      // 实际开发中，这里应该是一个真实的上传过程
      // 例如上传到微信云存储：
      // wx.cloud.uploadFile({
      //   cloudPath: `products/${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`,
      //   filePath: tempFilePath,
      //   success: res => { resolve(res.fileID); },
      //   fail: err => { reject(err); }
      // });
      
      // 这里为了演示，我们返回一个模拟的CDN路径
      setTimeout(() => {
        // 模拟上传成功，返回一个假的URL
        const uploadedUrl = '/assets/images/products/photo-1565299624946-b28f40a0ae38.jpeg';
        resolve(uploadedUrl);
      }, 500);
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
    
    wx.showLoading({
      title: '添加中',
    });
    
    // 处理图片上传
    let uploadTask;
    if (newProduct.tempImage) {
      uploadTask = this.uploadProductImage(newProduct.tempImage);
    } else {
      // 如果没有选择图片，就使用默认图片
      uploadTask = Promise.resolve('/assets/images/products/photo-1565299624946-b28f40a0ae38.jpeg');
    }
    
    // 等待图片上传完成后添加商品
    uploadTask.then(imageUrl => {
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
        image: imageUrl // 使用上传后的图片URL
      };
      
      // 删除临时图片字段
      delete productToAdd.tempImage;
      
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
    }).catch(error => {
      wx.hideLoading();
      wx.showToast({
        title: '图片上传失败',
        icon: 'none'
      });
      console.error('图片上传失败', error);
    });
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
   * 为当前编辑商品选择图片
   */
  chooseCurrentProductImage: function() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 获取选中图片的临时路径
        const tempFilePath = res.tempFilePaths[0];
        
        // 更新数据，显示预览图
        this.setData({
          'currentProduct.tempImage': tempFilePath
        });
        
        wx.showToast({
          title: '图片选择成功',
          icon: 'success'
        });
      }
    });
  },
  
  /**
   * 移除当前编辑商品图片
   */
  removeCurrentProductImage: function() {
    // 获取当前临时图片路径
    const tempImage = this.data.currentProduct.tempImage;
    
    // 清理临时文件
    this.removeTempFile(tempImage);
    
    // 更新状态
    this.setData({
      'currentProduct.tempImage': '',
      'currentProduct.image': '' // 同时清除原有图片路径
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
    
    wx.showLoading({
      title: '更新中',
    });
    
    // 处理图片上传
    let uploadTask;
    if (currentProduct.tempImage) {
      uploadTask = this.uploadProductImage(currentProduct.tempImage);
    } else {
      // 如果没有选择新图片，保留原来的图片
      uploadTask = Promise.resolve(currentProduct.image || '/assets/images/products/photo-1565299624946-b28f40a0ae38.jpeg');
    }
    
    // 等待图片上传完成后更新商品
    uploadTask.then(imageUrl => {
      // 更新商品列表
      const updatedProducts = products.map(p => {
        if (p.id === currentProduct.id) {
          // 创建更新后的商品对象
          const updatedProduct = {
            ...currentProduct,
            price: parseFloat(currentProduct.price),
            stock: parseInt(currentProduct.stock) || 0,
            image: imageUrl // 使用上传后的图片URL
          };
          
          // 删除临时图片字段
          delete updatedProduct.tempImage;
          
          return updatedProduct;
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
    }).catch(error => {
      wx.hideLoading();
      wx.showToast({
        title: '图片上传失败',
        icon: 'none'
      });
      console.error('图片上传失败', error);
    });
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
   * 切换人气推荐开关（新增商品）
   */
  onNewProductHotChange: function(e) {
    const { value } = e.detail;
    
    this.setData({
      'newProduct.isHot': value
    });
  },

  /**
   * 切换今日新鲜出炉开关（新增商品）
   */
  onNewProductNewChange: function(e) {
    const { value } = e.detail;
    
    this.setData({
      'newProduct.isNew': value
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
   * 切换人气推荐开关（编辑商品）
   */
  onEditProductHotChange: function(e) {
    const { value } = e.detail;
    
    this.setData({
      'currentProduct.isHot': value
    });
  },

  /**
   * 切换今日新鲜出炉开关（编辑商品）
   */
  onEditProductNewChange: function(e) {
    const { value } = e.detail;
    
    this.setData({
      'currentProduct.isNew': value
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
   * 添加规格选项到编辑商品
   */
  addOption: function() {
    let currentProduct = this.data.currentProduct;
    if (!currentProduct.options) {
      currentProduct.options = [];
    }
    
    currentProduct.options.push({
      name: '',
      price: 0
    });
    
    this.setData({
      currentProduct: currentProduct
    });
  },
  
  /**
   * 从编辑商品中移除规格选项
   */
  removeOption: function(e) {
    const index = e.currentTarget.dataset.index;
    let currentProduct = this.data.currentProduct;
    
    currentProduct.options.splice(index, 1);
    
    this.setData({
      currentProduct: currentProduct
    });
  },
  
  /**
   * 编辑商品规格选项名称变更
   */
  onOptionNameChange: function(e) {
    const index = e.currentTarget.dataset.index;
    let currentProduct = this.data.currentProduct;
    
    currentProduct.options[index].name = e.detail.value;
    
    this.setData({
      currentProduct: currentProduct
    });
  },
  
  /**
   * 编辑商品规格选项价格变更
   */
  onOptionPriceChange: function(e) {
    const index = e.currentTarget.dataset.index;
    let currentProduct = this.data.currentProduct;
    
    currentProduct.options[index].price = e.detail.value;
    
    this.setData({
      currentProduct: currentProduct
    });
  },
  
  /**
   * 添加规格选项到新商品
   */
  addNewOption: function() {
    let newProduct = this.data.newProduct;
    if (!newProduct.options) {
      newProduct.options = [];
    }
    
    newProduct.options.push({
      name: '',
      price: 0
    });
    
    this.setData({
      newProduct: newProduct
    });
  },
  
  /**
   * 从新商品中移除规格选项
   */
  removeNewOption: function(e) {
    const index = e.currentTarget.dataset.index;
    let newProduct = this.data.newProduct;
    
    newProduct.options.splice(index, 1);
    
    this.setData({
      newProduct: newProduct
    });
  },
  
  /**
   * 新商品规格选项名称变更
   */
  onNewOptionNameChange: function(e) {
    const index = e.currentTarget.dataset.index;
    let newProduct = this.data.newProduct;
    
    newProduct.options[index].name = e.detail.value;
    
    this.setData({
      newProduct: newProduct
    });
  },
  
  /**
   * 新商品规格选项价格变更
   */
  onNewOptionPriceChange: function(e) {
    const index = e.currentTarget.dataset.index;
    let newProduct = this.data.newProduct;
    
    newProduct.options[index].price = e.detail.value;
    
    this.setData({
      newProduct: newProduct
    });
  },

  /**
   * 预览商品详情
   */
  previewProduct: function(e) {
    const productId = e.currentTarget.dataset.id;
    
    wx.navigateTo({
      url: `/pages/product/detail/detail?id=${productId}&preview=true`,
    });
  },
  
  /**
   * 确认删除商品
   */
  confirmDeleteProduct: function(e) {
    const productId = e.currentTarget.dataset.id;
    const product = this.data.products.find(p => p.id == productId);
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除商品"${product.name}"吗？此操作不可恢复。`,
      confirmColor: '#a68a7b',
      success: (res) => {
        if (res.confirm) {
          this.deleteProduct(productId);
        }
      }
    });
  },
  
  /**
   * 删除商品
   */
  deleteProduct: function(productId) {
    wx.showLoading({
      title: '删除中',
    });
    
    // 模拟API请求
    setTimeout(() => {
      // 从数组中过滤掉要删除的商品
      const updatedProducts = this.data.products.filter(p => p.id != productId);
      
      this.setData({
        products: updatedProducts
      }, () => {
        // 更新过滤后的列表
        this.filterProducts();
        
        wx.hideLoading();
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
      });
    }, 500);
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
});
