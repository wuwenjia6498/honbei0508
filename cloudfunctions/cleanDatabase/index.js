// cleanDatabase/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-3g9nsaj9f3a1b0ed' // 替换为您的云环境ID
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    // 清空并重建商品和分类数据
    const { action = 'clean' } = event

    if (action === 'clean') {
      // 清空集合
      await clearCollection('products')
      await clearCollection('categories')
      
      // 返回结果
      return { 
        success: true, 
        message: '数据已清空' 
      }
    } 
    else if (action === 'init') {
      // 清空然后初始化
      await clearCollection('products')
      await clearCollection('categories')
      
      // 创建分类
      const categories = getDefaultCategories()
      // 使用Set来存储已添加的分类名，防止重复
      const addedCategoryNames = new Set()
      
      for (const category of categories) {
        // 检查分类名是否已存在
        if (!addedCategoryNames.has(category.name)) {
          await db.collection('categories').add({
            data: category
          })
          // 记录已添加的分类名
          addedCategoryNames.add(category.name)
        }
      }
      
      // 创建商品
      const products = getDefaultProducts()
      for (const product of products) {
        await db.collection('products').add({
          data: product
        })
      }
      
      // 返回结果
      return { 
        success: true, 
        message: '数据已清空并重新初始化',
        categoriesCount: addedCategoryNames.size,
        productsCount: products.length
      }
    }
    else {
      return {
        success: false,
        message: '未知操作'
      }
    }
  } catch (error) {
    console.error('清理数据库失败', error)
    return {
      success: false,
      error: error
    }
  }
}

// 清空集合
async function clearCollection(collectionName) {
  console.log(`开始清空集合: ${collectionName}`)
  
  try {
    // 因为云函数一次最多删除100条记录，所以需要分批删除
    const MAX_LIMIT = 100
    const countResult = await db.collection(collectionName).count()
    const total = countResult.total
    
    // 计算需要分几次删除
    const batchTimes = Math.ceil(total / MAX_LIMIT)
    
    console.log(`${collectionName} 集合共有 ${total} 条记录，需要分 ${batchTimes} 次删除`)
    
    // 分批删除
    for (let i = 0; i < batchTimes; i++) {
      // 获取该批次的数据
      const result = await db.collection(collectionName)
        .limit(MAX_LIMIT)
        .get()
      
      // 提取ID列表
      const ids = result.data.map(item => item._id)
      
      if (ids.length > 0) {
        // 删除这一批数据
        await db.collection(collectionName).where({
          _id: _.in(ids)
        }).remove()
        
        console.log(`已删除 ${collectionName} 第 ${i + 1}/${batchTimes} 批数据，共 ${ids.length} 条`)
      }
    }
    
    console.log(`${collectionName} 集合已清空`)
    return { success: true }
  } catch (error) {
    console.error(`清空 ${collectionName} 失败:`, error)
    throw error
  }
}

// 默认分类数据
function getDefaultCategories() {
  return [
    { 
      name: '蛋糕', 
      icon: '/assets/images/categories/cake.jpg', 
      productCount: 3,
      isActive: true,
      createTime: db.serverDate()
    },
    { 
      name: '面包', 
      icon: '/assets/images/categories/bread.jpg', 
      productCount: 3,
      isActive: true,
      createTime: db.serverDate()
    },
    { 
      name: '甜点', 
      icon: '/assets/images/categories/dessert.jpg', 
      productCount: 2,
      isActive: true,
      createTime: db.serverDate()
    },
    { 
      name: '饼干', 
      icon: '/assets/images/categories/cookies.jpg', 
      productCount: 2,
      isActive: true,
      createTime: db.serverDate()
    }
  ]
}

// 默认商品数据
function getDefaultProducts() {
  return [
    {
      name: '法式可颂',
      category: '面包',
      price: 32,
      image: '/assets/images/products/product-croissant.jpg',
      description: '酥脆可口的法式经典面包',
      rating: 4.5,
      reviews: 156,
      isNew: true,
      isFeatured: true,
      isHot: true,
      isActive: true,
      createTime: db.serverDate()
    },
    {
      name: '巧克力曲奇',
      category: '饼干',
      price: 28,
      image: '/assets/images/products/product-chocolate.jpg',
      description: '香浓巧克力，酥脆口感',
      rating: 4.7,
      reviews: 198,
      isNew: false,
      isFeatured: true,
      isHot: true,
      isActive: true,
      createTime: db.serverDate()
    },
    {
      name: '提拉米苏',
      category: '蛋糕',
      price: 68,
      image: '/assets/images/products/product-tiramisu.jpg',
      description: '意大利经典甜点，醇香浓郁',
      rating: 4.9,
      reviews: 324,
      isNew: true,
      isFeatured: true,
      isHot: true,
      isActive: true,
      createTime: db.serverDate()
    },
    {
      name: '肉桂卷',
      category: '面包',
      price: 45,
      image: '/assets/images/products/product-cinnamon.jpg',
      description: '肉桂香气，松软口感',
      rating: 4.6,
      reviews: 135,
      isNew: false,
      isFeatured: true,
      isHot: true,
      isActive: true,
      createTime: db.serverDate()
    },
    {
      name: '芝士蛋糕',
      category: '蛋糕',
      price: 58,
      image: '/assets/images/products/product-cheesecake.jpg',
      description: '浓郁芝士，口感细腻',
      rating: 4.8,
      reviews: 287,
      isNew: true,
      isFeatured: false,
      isHot: false,
      isActive: true,
      createTime: db.serverDate()
    },
    {
      name: '巧克力曲奇',
      category: '饼干',
      price: 36,
      image: '/assets/images/products/product-cookies.jpg',
      description: '传统美式曲奇，香脆可口',
      rating: 4.5,
      reviews: 178,
      isNew: false,
      isFeatured: true,
      isHot: true,
      isActive: true,
      createTime: db.serverDate()
    },
    {
      name: '全麦面包',
      category: '面包',
      price: 25,
      image: '/assets/images/products/product-bread.jpg',
      description: '健康全麦，营养丰富',
      rating: 4.4,
      reviews: 132,
      isNew: false,
      isFeatured: false,
      isHot: false,
      isActive: true,
      createTime: db.serverDate()
    },
    {
      name: '草莓蛋糕',
      category: '蛋糕',
      price: 72,
      image: '/assets/images/products/product-strawberry.jpg',
      description: '新鲜草莓，甜而不腻',
      rating: 4.8,
      reviews: 218,
      isNew: true,
      isFeatured: true,
      isHot: true,
      isActive: true,
      createTime: db.serverDate()
    },
    {
      name: '马卡龙',
      category: '甜点',
      price: 48,
      image: '/assets/images/products/product-macaron.jpg',
      description: '法式经典甜点，色彩缤纷',
      rating: 4.7,
      reviews: 156,
      isNew: true,
      isFeatured: true,
      isHot: true,
      isActive: true,
      createTime: db.serverDate()
    },
    {
      name: '奶油泡芙',
      category: '甜点',
      price: 38,
      image: '/assets/images/products/product-puff.jpg',
      description: '酥皮香脆，奶油丝滑',
      rating: 4.6,
      reviews: 142,
      isNew: false,
      isFeatured: true,
      isHot: true,
      isActive: true,
      createTime: db.serverDate()
    }
  ]
}