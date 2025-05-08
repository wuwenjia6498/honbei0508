const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

// 清除所有用户数据
exports.main = async (event, context) => {
  try {
    // 获取所有用户ID
    const users = await db.collection('users').get();
    
    // 每次删除最多100条记录
    const batchTimes = Math.ceil(users.data.length / 100);
    
    // 记录删除结果
    let deleted = 0;
    
    // 批量删除
    for (let i = 0; i < batchTimes; i++) {
      const batch = users.data.slice(i * 100, (i + 1) * 100);
      const idList = batch.map(user => user._id);
      
      // 逐条删除
      for (let j = 0; j < idList.length; j++) {
        await db.collection('users').doc(idList[j]).remove();
        deleted++;
      }
    }

    return {
      success: true,
      deleted: deleted,
      message: `已成功删除 ${deleted} 条用户数据`
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
} 