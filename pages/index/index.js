// index.js
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Page({
  data: {
    motto: 'Hello World',
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
    },
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    canIUseNicknameComp: wx.canIUse('input.type.nickname'),
    freshProducts: [
      {
        id: 1,
        name: '法式牛角面包',
        price: 12,
        image: '/assets/images/products/product-croissant.jpg'
      },
      {
        id: 2,
        name: '抹茶红豆蛋糕',
        price: 28,
        image: '/assets/images/products/product-matcha-cake.jpg'
      }
    ],
    popularProducts: [
      {
        id: 3,
        name: '经典提拉米苏',
        price: 38,
        image: '/assets/images/products/product-tiramisu.jpg',
        rating: 4.9,
        reviews: 324
      },
      {
        id: 4,
        name: '芒果千层蛋糕',
        price: 45,
        image: '/assets/images/products/product-mango-layer.jpg',
        rating: 4.8,
        reviews: 256
      },
      {
        id: 5,
        name: '巧克力布朗尼',
        price: 32,
        image: '/assets/images/products/product-brownie.jpg',
        rating: 4.7,
        reviews: 198
      },
      {
        id: 6,
        name: '经典奶油泡芙',
        price: 18,
        image: '/assets/images/products/product-cream-puff.jpg',
        rating: 4.6,
        reviews: 152
      }
    ]
  },
  bindViewTap() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    const { nickName } = this.data.userInfo
    this.setData({
      "userInfo.avatarUrl": avatarUrl,
      hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
    })
  },
  onInputChange(e) {
    const nickName = e.detail.value
    const { avatarUrl } = this.data.userInfo
    this.setData({
      "userInfo.nickName": nickName,
      hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
    })
  },
  getUserProfile(e) {
    // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认，开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (res) => {
        console.log(res)
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    })
  },
  onLoad() {
    // 页面加载时的逻辑
  },
  // 跳转到商品详情
  goToProductDetail(e) {
    const productId = e.currentTarget.dataset.id;
    // 因为还没有实现商品详情页，先用提示代替
    wx.showToast({
      title: '商品详情页开发中',
      icon: 'none'
    });
    // 后续实现时可以用以下代码
    // wx.navigateTo({
    //   url: `/pages/product/product?id=${productId}`
    // });
  },
  // 添加到购物车
  addToCart(e) {
    const productId = e.currentTarget.dataset.id;
    wx.showToast({
      title: '已加入购物车',
      icon: 'success'
    });
  },
  // 查看全部新鲜商品
  viewAllFresh() {
    wx.showToast({
      title: '全部新鲜商品页开发中',
      icon: 'none'
    });
  },
  // 查看全部人气商品
  viewAllPopular() {
    wx.showToast({
      title: '全部人气商品页开发中',
      icon: 'none'
    });
  }
})
