const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

// 初始化用户集合
exports.main = async (event, context) => {
  try {
    // 创建用户集合
    await db.createCollection('users')
    
    // 创建索引
    await db.collection('users').createIndex({
      data: {
        nickname: 1,
        phone: 1,
        level: 1,
        status: 1,
        registerTime: 1
      }
    })

    return {
      success: true,
      message: '用户集合初始化成功'
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
} 