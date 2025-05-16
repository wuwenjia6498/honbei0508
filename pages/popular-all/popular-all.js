// popular-all.js
const app = getApp()

Page({
  data: {
    sortType: 'default', // default, sales, rating, price
    sortOrder: 'desc', // asc 升序, desc 降序
    popularProducts: [],
    originalProductList: [], // 保存原始商品列表，用于排序
    loading: true,
    pageNum: 1,
    pageSize: 10,
    totalPages: 1,
    isLoadingMore: false,
    noMoreData: false
  },
  onLoad: function (options) {
    wx.setNavigationBarTitle({
      title: '人气推荐'
    });
    
    // 获取人气推荐商品
    this.getPopularProducts()
  },
  
  // 获取人气推荐商品
  getPopularProducts(more = false) {
    if (more) {
      if (this.data.pageNum >= this.data.totalPages) {
        this.setData({
          noMoreData: true,
          isLoadingMore: false
        })
        return
      }
      
      this.setData({
        isLoadingMore: true,
        pageNum: this.data.pageNum + 1
      })
    } else {
      this.setData({
        loading: true,
        pageNum: 1,
        popularProducts: []
      })
    }
    
    wx.cloud.callFunction({
      name: 'getproducts',
      data: {
        isHot: true,
        pageNum: this.data.pageNum,
        pageSize: this.data.pageSize
      },
      success: res => {
        console.log('获取人气推荐商品成功', res)
        if (res.result && res.result.success) {
          const products = more ? 
            [...this.data.popularProducts, ...res.result.data] : 
            res.result.data
          
          const originalList = this.data.pageNum === 1 ? 
            products : 
            [...this.data.originalProductList, ...res.result.data]
          
          // 处理图片URL
          this.processProductImages(products, originalList);
        }
      },
      fail: err => {
        console.error('获取人气推荐商品失败', err)
        this.setData({
          loading: false,
          isLoadingMore: false
        })
      }
    })
  },
  
  // 处理商品图片URL
  processProductImages(products, originalList) {
    console.log('处理商品图片URL');
    
    // 收集需要获取临时URL的云存储图片
    const cloudFileIDs = [];
    products.forEach(product => {
      if (product.image && product.image.startsWith('cloud://')) {
        cloudFileIDs.push(product.image);
      }
    });
    
    if (cloudFileIDs.length > 0) {
      // 有云存储图片，获取临时URL
      wx.cloud.getTempFileURL({
        fileList: cloudFileIDs,
        success: res => {
          console.log('获取临时文件URL成功:', res);
          
          // 创建ID到URL的映射
          const urlMap = {};
          if (res.fileList) {
            res.fileList.forEach(item => {
              if (item.fileID && item.tempFileURL) {
                urlMap[item.fileID] = item.tempFileURL;
              }
            });
          }
          
          // 更新商品图片URL
          const processedProducts = products.map(product => {
            if (product.image && product.image.startsWith('cloud://')) {
              if (urlMap[product.image]) {
                // 有临时URL，使用临时URL
                return { ...product, image: urlMap[product.image] };
              }
            }
            return product;
          });
          
          // 同样处理原始商品列表
          const processedOriginalList = originalList.map(product => {
            if (product.image && product.image.startsWith('cloud://')) {
              if (urlMap[product.image]) {
                return { ...product, image: urlMap[product.image] };
              }
            }
            return product;
          });
          
          // 更新数据
          this.setData({
            popularProducts: processedProducts,
            originalProductList: processedOriginalList,
            loading: false,
            isLoadingMore: false,
            totalPages: this.data.totalPages,
            noMoreData: this.data.pageNum >= this.data.totalPages
          });
        },
        fail: err => {
          console.error('获取临时文件URL失败:', err);
          // 即使失败也更新数据
          this.setData({
            popularProducts: products,
            originalProductList: originalList,
            loading: false,
            isLoadingMore: false,
            totalPages: this.data.totalPages,
            noMoreData: this.data.pageNum >= this.data.totalPages
          });
        }
      });
    } else {
      // 没有云存储图片，直接更新数据
      this.setData({
        popularProducts: products,
        originalProductList: originalList,
        loading: false,
        isLoadingMore: false,
        totalPages: this.data.totalPages,
        noMoreData: this.data.pageNum >= this.data.totalPages
      });
    }
  },
  
  // 改变排序方式
  changeSort(e) {
    const type = e.currentTarget.dataset.type;
    let order = this.data.sortOrder;
    
    // 如果点击的是当前选中的排序方式，则切换升降序
    if (type === this.data.sortType && type === 'price') {
      order = order === 'asc' ? 'desc' : 'asc';
    } else {
      // 默认降序，价格默认升序
      order = type === 'price' ? 'asc' : 'desc';
    }
    
    this.setData({
      sortType: type,
      sortOrder: order
    });
    
    this.sortProducts(type, order);
  },
  
  // 排序商品
  sortProducts(type, order) {
    let products = [...this.data.originalProductList];
    
    switch (type) {
      case 'sales':
        products.sort((a, b) => {
          const aSales = a.salesCount || 0;
          const bSales = b.salesCount || 0;
          return order === 'asc' ? aSales - bSales : bSales - aSales;
        });
        break;
      case 'rating':
        products.sort((a, b) => {
          const aRating = a.rating || 0;
          const bRating = b.rating || 0;
          return order === 'asc' ? aRating - bRating : bRating - aRating;
        });
        break;
      case 'price':
        products.sort((a, b) => {
          return order === 'asc' ? a.price - b.price : b.price - a.price;
        });
        break;
      default:
        // 默认排序，不做处理
        break;
    }
    
    this.setData({
      popularProducts: products
    });
  },
  
  // 跳转到商品详情
  goToProductDetail(e) {
    const productId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/product/product?id=${productId}`
    });
  },
  
  // 添加到购物车
  addToCart(e) {
    const productId = e.currentTarget.dataset.id;
    
    // 检查登录状态
    if (!app.globalData.isLogin) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    // 查找商品
    const product = this.data.popularProducts.find(item => item._id === productId);
    
    // 如果找到商品，检查库存
    if (product) {
      // 检查库存是否足够
      const stock = product.stock !== undefined ? product.stock : 0;
      if (stock <= 0) {
        wx.showToast({
          title: '商品库存不足',
          icon: 'none',
          duration: 2000
        });
        return;
      }
    }
    
    wx.cloud.callFunction({
      name: 'cartService',
      data: {
        action: 'addToCart',
        productId: productId,
        quantity: 1
      },
      success: res => {
        console.log('添加购物车成功', res)
        if (res.result && res.result.success) {
          wx.showToast({
            title: '已加入购物车',
            icon: 'success'
          })
        } else {
          wx.showToast({
            title: res.result.message || '添加失败',
            icon: 'none'
          })
        }
      },
      fail: err => {
        console.error('添加购物车失败', err)
        wx.showToast({
          title: '添加失败',
          icon: 'none'
        })
      }
    })
  },
  
  // 下拉刷新
  onPullDownRefresh() {
    this.getPopularProducts()
    wx.stopPullDownRefresh()
  },
  
  // 上拉加载更多
  onReachBottom() {
    if (!this.data.noMoreData && !this.data.isLoadingMore) {
      this.getPopularProducts(true)
    }
  }
}) 