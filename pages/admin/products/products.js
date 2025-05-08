Page({
  /**
   * 页面的初始数据
   */
  data: {
    products: [],
    filteredProducts: [],
    showAddForm: false,
    showEditForm: false,
    currentProduct: null,
    categories: [],
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
    },
    showDatabaseModal: false,
    dbActionMessage: '',
    dbActionSuccess: false,
    dbActionLoading: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.log("商品管理页面加载");
    
    try {
      // 检查管理员登录状态
      this.checkAdminAuth();
      
      // 显示加载中
      wx.showLoading({
        title: '加载数据中',
      });
      
      // 先获取分类数据，再获取商品数据
      this.getCategoriesData().then(() => {
        // 在分类数据加载完成后，再获取商品数据
        return this.getProductsData();
      }).catch(err => {
        console.error("获取分类数据失败:", err);
        // 即使分类获取失败，也尝试获取商品数据
        return this.getProductsData();
      }).finally(() => {
        wx.hideLoading();
      });
      
    } catch (error) {
      console.error("onLoad错误:", error);
      wx.hideLoading();
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
    
    // 每次页面显示时，重新获取分类数据和商品数据
    wx.showLoading({
      title: '加载数据中',
    });
    
    this.getCategoriesData().then(() => {
      return this.getProductsData();
    }).catch(err => {
      console.error("onShow获取分类数据失败:", err);
      return this.getProductsData();
    }).finally(() => {
      wx.hideLoading();
    });
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
    return new Promise((resolve, reject) => {
      // 从云数据库中获取商品数据
      wx.cloud.callFunction({
        name: 'getproducts',
        data: {
          onlyActive: false // 获取所有商品，不管是否激活
        }
      }).then(res => {
        console.log('从云数据库获取商品数据:', res);
        
        if (res.result && res.result.success) {
          // 处理返回的商品数据
          const cloudProducts = res.result.data || [];
          
          if (cloudProducts.length > 0) {
            // 将云数据库中的商品数据规范化，确保所有必要字段都存在
            const normalizedProducts = cloudProducts.map(product => {
              // 处理图片路径
              let imageUrl = product.image || '/assets/images/products/product-tiramisu.jpg';
              
              // 确保云存储图片能正确显示
              if (imageUrl.startsWith('cloud://')) {
                // 获取临时文件链接并缓存
                this.getImageTempUrl(imageUrl, product._id);
              }
              
              return {
                id: product._id, // 使用数据库ID作为商品ID
                _id: product._id, // 保留原始数据库ID
                name: product.name || '',
                image: imageUrl,
                price: parseFloat(product.price) || 0,
                spec: product.spec || '',
                stock: parseInt(product.stock) || 0,
                category: product.category || '其他',
                isActive: product.isActive !== undefined ? product.isActive : true,
                isHot: product.isHot !== undefined ? product.isHot : false,
                isNew: product.isNew !== undefined ? product.isNew : false,
                description: product.description || '',
                ingredients: product.ingredients || '',
                calories: product.calories || '',
                shelfLife: product.shelfLife || '',
                storage: product.storage || '',
                bakingTime: product.bakingTime || '',
                options: product.options || []
              };
            });
            
            // 更新页面数据
            this.setData({
              products: normalizedProducts,
              filteredProducts: normalizedProducts
            });
            
            console.log('成功加载商品数据，共', normalizedProducts.length, '个商品');
            resolve(normalizedProducts);
          } else {
            console.warn('云数据库中没有商品数据，使用备用数据');
            const backupData = this.getBackupProductsData();
            this.setData({
              products: backupData,
              filteredProducts: backupData
            });
            resolve(backupData);
          }
        } else {
          console.error('从云数据库获取商品数据失败:', res);
          wx.showToast({
            title: '获取商品数据失败',
            icon: 'none'
          });
          
          // 使用备用数据
          const backupData = this.getBackupProductsData();
          this.setData({
            products: backupData,
            filteredProducts: backupData
          });
          reject(new Error('获取商品数据失败'));
        }
      }).catch(err => {
        console.error('调用云函数获取商品数据失败:', err);
        
        wx.showToast({
          title: '获取商品数据失败',
          icon: 'none'
        });
        
        // 使用备用数据
        const backupData = this.getBackupProductsData();
        this.setData({
          products: backupData,
          filteredProducts: backupData
        });
        reject(err);
      });
    });
  },

  /**
   * 获取分类数据
   */
  getCategoriesData: function() {
    return new Promise((resolve, reject) => {
      // 调用云函数获取分类数据
      wx.cloud.callFunction({
        name: 'getCategories',
        data: {
          action: 'get'
        }
      }).then(res => {
        if (res.result && res.result.success && res.result.data) {
          // 提取分类名称
          const categoryNames = res.result.data.map(item => item.name);
          
          // 对分类名称进行去重
          const uniqueCategoryNames = [...new Set(categoryNames)];
          
          this.setData({
            categories: uniqueCategoryNames
          });
          
          console.log('成功加载分类数据:', uniqueCategoryNames);
          resolve(uniqueCategoryNames);
        } else {
          console.error('获取分类数据失败:', res);
          reject(new Error('获取分类数据失败'));
        }
      }).catch(err => {
        console.error('获取分类数据失败:', err);
        reject(err);
      });
    });
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
    const { products, currentCategory, searchKeyword, categories } = this.data;
    
    console.log("过滤前商品数量:", products.length);
    console.log("当前分类:", currentCategory);
    console.log("搜索关键词:", searchKeyword);
    console.log("可用类目:", categories);
    
    let filtered = [...products];
    
    // 按分类过滤，只显示有效的类目中的商品
    if (currentCategory !== 'all') {
      // 确认当前选中的类目在可用类目列表中
      if (categories.includes(currentCategory)) {
        filtered = filtered.filter(p => p.category === currentCategory);
      } else {
        console.warn(`当前选中的类目 "${currentCategory}" 不在可用类目列表中`);
        // 重置为全部
        this.setData({ currentCategory: 'all' });
      }
    }
    
    // 按关键词搜索
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(keyword) || 
        (p.category && p.category.toLowerCase().includes(keyword))
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
    // 获取默认类目，使用第一个可用的类目，如果没有则使用"蛋糕"作为默认值
    const defaultCategory = this.data.categories.length > 0 ? this.data.categories[0] : '蛋糕';
    
    this.setData({
      showAddForm: true,
      newProduct: {
        name: '',
        price: '',
        spec: '',
        stock: '',
        category: defaultCategory,
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
      uploadTask = this.uploadProductImageToCloud(newProduct.tempImage);
    } else {
      // 如果没有选择图片，就使用默认图片
      uploadTask = Promise.resolve('/assets/images/products/photo-1565299624946-b28f40a0ae38.jpeg');
    }
    
    // 等待图片上传完成后添加商品
    uploadTask.then(imageUrl => {
      // 准备要添加到云数据库的数据
      const productToAdd = {
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        spec: newProduct.spec,
        stock: parseInt(newProduct.stock) || 0,
        category: newProduct.category,
        isActive: newProduct.isActive,
        isHot: newProduct.isHot,
        isNew: newProduct.isNew,
        description: newProduct.description,
        ingredients: newProduct.ingredients,
        calories: newProduct.calories,
        shelfLife: newProduct.shelfLife,
        storage: newProduct.storage,
        bakingTime: newProduct.bakingTime,
        options: newProduct.options || [],
        image: imageUrl,
        createTime: new Date()
      };
      
      // 调用云函数添加商品
      wx.cloud.callFunction({
        name: 'products',
        data: {
          action: 'add',
          product: productToAdd
        }
      }).then(res => {
        wx.hideLoading();
        
        if (res.result && res.result.success) {
          const newProductWithId = {
            ...productToAdd,
            id: res.result.productId, // 使用返回的ID
            _id: res.result.productId // 保存云数据库ID
          };
          
          // 添加到本地数组
          const products = this.data.products;
          products.unshift(newProductWithId);
          
          this.setData({
            products,
            showAddForm: false
          }, () => {
            this.filterProducts();
          });
          
          wx.showToast({
            title: '添加成功',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: res.result?.message || '添加失败',
            icon: 'none'
          });
          console.error('添加商品失败:', res.result);
        }
      }).catch(err => {
        wx.hideLoading();
        wx.showToast({
          title: '添加失败',
          icon: 'none'
        });
        console.error('添加商品失败:', err);
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
   * 上传图片到云存储
   */
  uploadProductImageToCloud: function(tempFilePath) {
    return new Promise((resolve, reject) => {
      // 生成随机文件名
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const cloudPath = `products/${timestamp}_${randomStr}.jpg`;
      
      // 上传到云存储
      wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: tempFilePath,
        success: res => {
          console.log('图片上传成功:', res);
          resolve(res.fileID); // 返回文件ID作为图片URL
        },
        fail: err => {
          console.error('图片上传失败:', err);
          reject(err);
        }
      });
    });
  },
  
  /**
   * 上传图片到服务器
   * 实际项目中，应该上传到云存储或服务器
   */
  uploadProductImage: function(tempFilePath) {
    // 此方法保留与uploadProductImageToCloud逻辑相同，但在需要本地测试时可切换
    return this.uploadProductImageToCloud(tempFilePath);
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
    const { currentProduct } = this.data;
    
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
      title: '保存中',
    });
    
    // 处理图片上传
    let uploadTask;
    if (currentProduct.tempImage) {
      uploadTask = this.uploadProductImageToCloud(currentProduct.tempImage);
    } else {
      // 如果没有新的图片，就使用现有的
      uploadTask = Promise.resolve(currentProduct.image);
    }
    
    // 等待图片上传完成后保存商品
    uploadTask.then(imageUrl => {
      // 准备要更新的数据
      const productToUpdate = {
        name: currentProduct.name,
        price: parseFloat(currentProduct.price),
        spec: currentProduct.spec,
        stock: parseInt(currentProduct.stock) || 0,
        category: currentProduct.category,
        isActive: currentProduct.isActive,
        isHot: currentProduct.isHot,
        isNew: currentProduct.isNew,
        description: currentProduct.description,
        ingredients: currentProduct.ingredients,
        calories: currentProduct.calories,
        shelfLife: currentProduct.shelfLife,
        storage: currentProduct.storage,
        bakingTime: currentProduct.bakingTime,
        options: currentProduct.options || [],
        image: imageUrl,
        updateTime: new Date()
      };
      
      // 调用云函数更新商品
      wx.cloud.callFunction({
        name: 'products',
        data: {
          action: 'update',
          productId: currentProduct._id || currentProduct.id,
          product: productToUpdate
        }
      }).then(res => {
        wx.hideLoading();
        
        if (res.result && res.result.success) {
          // 更新本地数组中的数据
          const { products } = this.data;
          const index = products.findIndex(p => p.id === currentProduct.id);
          
          if (index !== -1) {
            // 保留原有的id和_id字段
            const updatedProduct = {
              ...productToUpdate,
              id: currentProduct.id,
              _id: currentProduct._id
            };
            
            products[index] = updatedProduct;
            
            this.setData({
              products,
              showEditForm: false
            }, () => {
              this.filterProducts();
            });
          }
          
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: res.result?.message || '保存失败',
            icon: 'none'
          });
          console.error('更新商品失败:', res.result);
        }
      }).catch(err => {
        wx.hideLoading();
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
        console.error('更新商品失败:', err);
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
   * 确认删除商品
   */
  confirmDeleteProduct: function(e) {
    const productId = e.currentTarget.dataset.id;
    const productName = e.currentTarget.dataset.name;
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除商品"${productName}"吗？此操作不可撤销。`,
      success: res => {
        if (res.confirm) {
          this.deleteProduct(e);
        }
      }
    });
  },
  
  /**
   * 删除商品
   */
  deleteProduct: function(e) {
    const productId = e.currentTarget.dataset.id;
    const productName = e.currentTarget.dataset.name;
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除商品"${productName}"吗？此操作不可撤销。`,
      success: res => {
        if (res.confirm) {
          wx.showLoading({
            title: '删除中',
          });
          
          // 调用云函数删除商品
          wx.cloud.callFunction({
            name: 'products',
            data: {
              action: 'delete',
              productId: productId
            }
          }).then(res => {
            wx.hideLoading();
            
            if (res.result && res.result.success) {
              // 从本地数组中移除
              const { products } = this.data;
              const newProducts = products.filter(p => p.id !== productId);
              
              this.setData({
                products: newProducts
              }, () => {
                this.filterProducts();
              });
              
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
            } else {
              wx.showToast({
                title: res.result?.message || '删除失败',
                icon: 'none'
              });
              console.error('删除商品失败:', res.result);
            }
          }).catch(err => {
            wx.hideLoading();
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
            console.error('删除商品失败:', err);
          });
        }
      }
    });
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
    
    // 批量处理云存储图片链接
    this.batchGetImageTempUrls(this.data.products);
  },

  /**
   * 获取备用商品数据
   */
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
    ];
  },

  // 数据库管理相关方法
  
  /**
   * 打开数据库操作弹窗
   */
  openDatabaseActionModal: function() {
    const lastCloudDeployTime = wx.getStorageSync('lastCloudDeployTime') || 0;
    const now = Date.now();
    
    // 如果距离上次部署提醒超过2天，再次提醒
    if (now - lastCloudDeployTime > 2 * 24 * 60 * 60 * 1000) {
      wx.showModal({
        title: '首次使用提示',
        content: '使用数据库管理功能前，请确保已成功部署cleanDatabase云函数。若未部署，可能会导致操作失败。',
        confirmText: '我已部署',
        cancelText: '查看教程',
        success: (res) => {
          if (res.cancel) {
            this.checkCloudFunctionDeployment();
            return;
          }
          
          // 存储最后部署提醒时间
          wx.setStorageSync('lastCloudDeployTime', now);
          
          // 打开数据库操作弹窗
          this.setData({
            showDatabaseModal: true,
            dbActionMessage: '',
            dbActionSuccess: false
          });
        }
      });
    } else {
      // 直接打开数据库操作弹窗
      this.setData({
        showDatabaseModal: true,
        dbActionMessage: '',
        dbActionSuccess: false
      });
    }
  },
  
  /**
   * 关闭数据库操作弹窗
   */
  closeDatabaseActionModal: function() {
    this.setData({
      showDatabaseModal: false
    });
  },
  
  /**
   * 只清空数据库，不添加测试数据
   */
  cleanDatabaseOnly: function() {
    wx.showModal({
      title: '确认清空数据库',
      content: '此操作将清空所有商品和分类数据，不会添加任何测试数据。此操作不可恢复！',
      confirmText: '确认清空',
      confirmColor: '#ef5350',
      success: (res) => {
        if (res.confirm) {
          this.callCleanDatabaseFunction('clean');
        }
      }
    });
  },
  
  /**
   * 清空并初始化测试数据
   */
  initDatabaseWithTestData: function() {
    wx.showModal({
      title: '确认初始化数据',
      content: '此操作将清空所有现有数据，并添加默认测试数据。此操作不可恢复！',
      confirmText: '确认初始化',
      confirmColor: '#42a5f5',
      success: (res) => {
        if (res.confirm) {
          this.callCleanDatabaseFunction('init');
        }
      }
    });
  },
  
  /**
   * 调用清理数据库云函数
   */
  callCleanDatabaseFunction: function(action) {
    // 设置加载状态
    this.setData({
      dbActionLoading: true,
      dbActionMessage: '正在处理，请稍候...'
    });
    
    // 调用云函数
    wx.cloud.callFunction({
      name: 'cleanDatabase',
      data: { action },
      success: (res) => {
        console.log('云函数调用成功：', res);
        
        // 检查返回结果的格式是否正确
        if (!res.result) {
          // 处理返回值为空的情况
          this.setData({
            dbActionMessage: '云函数返回结果为空，请检查云函数实现',
            dbActionSuccess: false
          });
          return;
        }
        
        // 在有些情况下，云函数可能只返回简单的 true 或一个消息字符串
        if (typeof res.result === 'boolean' && res.result === true) {
          this.setData({
            dbActionMessage: '操作成功',
            dbActionSuccess: true
          });
          
          // 操作成功后，重新加载商品列表
          setTimeout(() => {
            this.refreshAfterDatabaseAction();
          }, 1500);
          return;
        }
        
        if (typeof res.result === 'string') {
          this.setData({
            dbActionMessage: res.result,
            dbActionSuccess: true
          });
          
          setTimeout(() => {
            this.refreshAfterDatabaseAction();
          }, 1500);
          return;
        }
        
        // 标准格式：具有 success 属性的对象
        if (res.result.success) {
          // 操作成功
          let message = res.result.message || '操作成功';
          
          // 如果有更多详情，显示在消息中
          if (res.result.categoriesCount !== undefined && res.result.productsCount !== undefined) {
            message += `\n已创建${res.result.categoriesCount}个分类和${res.result.productsCount}个商品`;
          }
          
          this.setData({
            dbActionMessage: message,
            dbActionSuccess: true
          });
          
          // 操作成功后，重新加载商品列表
          setTimeout(() => {
            this.refreshAfterDatabaseAction();
          }, 1500);
        } else {
          // 操作失败
          this.setData({
            dbActionMessage: res.result.message || '操作失败，请查看控制台日志',
            dbActionSuccess: false
          });
        }
      },
      fail: (err) => {
        console.error('云函数调用失败：', err);
        this.setData({
          dbActionMessage: `操作失败：${err.errMsg || '未知错误'}`,
          dbActionSuccess: false
        });
      },
      complete: () => {
        this.setData({
          dbActionLoading: false
        });
      }
    });
  },
  
  /**
   * 数据库操作后刷新商品列表
   */
  refreshAfterDatabaseAction: function() {
    wx.showLoading({
      title: '刷新数据',
    });
    
    // 从云数据库重新获取数据
    wx.cloud.callFunction({
      name: 'getproducts',
      data: {
        onlyActive: false
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        const products = res.result.data || [];
        
        // 更新页面数据
        this.setData({
          products: products,
          filteredProducts: products,
          showDatabaseModal: false // 关闭弹窗
        });
        
        wx.showToast({
          title: '数据已刷新',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: '获取数据失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('获取数据失败：', err);
      
      // 如果获取失败，使用备用数据
      const backupData = this.getBackupProductsData();
      this.setData({
        products: backupData,
        filteredProducts: backupData,
        showDatabaseModal: false
      });
      
      wx.showToast({
        title: '获取数据失败，已使用备用数据',
        icon: 'none'
      });
    });
  },
  
  /**
   * 检查云函数是否正确部署
   */
  checkCloudFunctionDeployment: function() {
    // 显示指导弹窗
    wx.showModal({
      title: '云函数操作提示',
      content: '如果数据库操作失败，请确保cleanDatabase云函数已正确部署。\n\n请在开发者工具中：\n1. 打开cloudfunctions/cleanDatabase文件夹\n2. 右键点击并选择"上传并部署：云端安装依赖"\n3. 等待部署完成后再次尝试',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  /**
   * 获取云存储图片的临时URL
   */
  getImageTempUrl: function(fileID, productId) {
    if (!fileID || !fileID.startsWith('cloud://')) {
      return;
    }
    
    // 获取临时文件链接
    wx.cloud.getTempFileURL({
      fileList: [fileID],
      success: res => {
        console.log('获取临时文件链接成功', res);
        if (res.fileList && res.fileList.length > 0) {
          const tempFileURL = res.fileList[0].tempFileURL;
          
          // 更新单个商品的图片链接
          const products = this.data.products;
          const index = products.findIndex(p => p.id === productId);
          
          if (index !== -1) {
            products[index].image = tempFileURL;
            
            this.setData({
              products: products
            }, () => {
              // 更新过滤后的商品列表
              this.filterProducts();
            });
          }
        }
      },
      fail: err => {
        console.error('获取临时文件链接失败', err);
      }
    });
  },

  /**
   * 批量获取云存储图片的临时URL
   */
  batchGetImageTempUrls: function(products) {
    if (!products || products.length === 0) {
      return products;
    }
    
    // 收集所有需要获取临时链接的fileID
    const fileIDList = [];
    const fileIDToProductMap = {};
    
    products.forEach(product => {
      if (product.image && product.image.startsWith('cloud://')) {
        fileIDList.push(product.image);
        fileIDToProductMap[product.image] = product.id;
      }
    });
    
    if (fileIDList.length === 0) {
      return products;
    }
    
    // 批量获取临时文件链接
    wx.cloud.getTempFileURL({
      fileList: fileIDList,
      success: res => {
        console.log('批量获取临时文件链接成功', res);
        if (res.fileList && res.fileList.length > 0) {
          const updatedProducts = [...this.data.products];
          
          res.fileList.forEach(file => {
            const productId = fileIDToProductMap[file.fileID];
            const index = updatedProducts.findIndex(p => p.id === productId);
            
            if (index !== -1) {
              updatedProducts[index].image = file.tempFileURL;
            }
          });
          
          this.setData({
            products: updatedProducts
          }, () => {
            // 更新过滤后的商品列表
            this.filterProducts();
          });
        }
      },
      fail: err => {
        console.error('批量获取临时文件链接失败', err);
      }
    });
    
    return products;
  },
});
