const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

// 插入测试用户数据
exports.main = async (event, context) => {
  try {
    // 先检查是否已经有用户数据
    const userCount = await db.collection('users').count();
    
    // 如果已经存在用户数据，则不重复插入
    if (userCount.total > 0) {
      return {
        success: true,
        message: '已存在用户数据，跳过插入',
        insertCount: 0
      };
    }
    
    // 模拟用户数据
    const testUsers = [
      {
        nickname: '李小姐',
        phone: '13812345678',
        level: 'premium',
        status: 'active',
        registerTime: new Date('2023-01-15'),
        orderCount: 12,
        totalSpent: 1258.50
      },
      {
        nickname: '王先生',
        phone: '13987654321',
        level: 'normal',
        status: 'active',
        registerTime: new Date('2023-02-22'),
        orderCount: 5,
        totalSpent: 786.30
      },
      {
        nickname: '张小姐',
        phone: '13600123456',
        level: 'premium',
        status: 'active',
        registerTime: new Date('2022-11-05'),
        orderCount: 23,
        totalSpent: 2143.75
      },
      {
        nickname: '赵先生',
        phone: '13911233444',
        level: 'normal',
        status: 'active',
        registerTime: new Date('2023-03-17'),
        orderCount: 3,
        totalSpent: 452.00
      },
      {
        nickname: '陈小姐',
        phone: '13855667788',
        level: 'normal',
        status: 'active',
        registerTime: new Date('2023-05-02'),
        orderCount: 1,
        totalSpent: 86.50
      },
      {
        nickname: '刘先生',
        phone: '13712345678',
        level: 'normal',
        status: 'inactive',
        registerTime: new Date('2023-05-08'),
        orderCount: 0,
        totalSpent: 0
      },
      {
        nickname: '林女士',
        phone: '13566778899',
        level: 'premium',
        status: 'active',
        registerTime: new Date('2023-01-03'),
        orderCount: 18,
        totalSpent: 3245.60
      },
      {
        nickname: '吴先生',
        phone: '13811223344',
        level: 'normal',
        status: 'inactive',
        registerTime: new Date('2023-04-12'),
        orderCount: 2,
        totalSpent: 178.90
      }
    ]

    // 批量插入数据
    const result = await db.collection('users').add({
      data: testUsers
    })

    return {
      success: true,
      insertCount: testUsers.length,
      message: '测试用户数据插入成功'
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
} 