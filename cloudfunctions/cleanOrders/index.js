// 云函数入口文件
const cloud = require('wx-server-sdk')

// 初始化云环境
try {
  cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
  })
  console.log('使用动态环境初始化成功');
} catch (err) {
  console.error('使用动态环境初始化失败:', err);
  // 尝试不指定环境
  cloud.init()
  console.log('使用默认环境初始化成功');
}

// 获取数据库引用
const db = cloud.database();
const _ = db.command;
const MAX_LIMIT = 100; // 数据库操作的最大批量数

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('cleanOrders云函数被调用');
  
  try {
    // 获取当前环境信息
    const wxContext = cloud.getWXContext();
    
    // 验证管理员权限（可以跳过验证用于调试，设置skipAuth参数为true）
    const skipAuth = event.skipAuth === true;
    if (!skipAuth) {
      let isAdmin = false;
      try {
        const adminConfig = await db.collection('config').doc('adminConfig').get();
        if (adminConfig.data && adminConfig.data.adminOpenids) {
          isAdmin = adminConfig.data.adminOpenids.includes(wxContext.OPENID);
        }
      } catch (err) {
        console.error('检查管理员权限失败:', err);
        // 权限检查失败时，默认拒绝操作
        return {
          success: false,
          message: '管理员权限检查失败，请确保config集合已正确配置'
        };
      }
      
      // 非管理员无权清空订单
      if (!isAdmin) {
        return {
          success: false,
          message: '权限不足，仅管理员可执行此操作'
        };
      }
    }
    
    // 清空orders集合
    console.log('开始清空orders集合...');
    
    // 计算订单总数
    let countResult;
    try {
      countResult = await db.collection('orders').count();
    } catch (err) {
      console.error('获取订单总数失败:', err);
      return {
        success: false,
        message: '获取订单总数失败: ' + err.message
      };
    }
    
    const total = countResult.total;
    console.log(`orders集合共有${total}条数据`);
    
    // 如果没有数据，直接返回成功
    if (total === 0) {
      return {
        success: true,
        message: '订单集合已为空',
        total: 0
      };
    }
    
    // 尝试方法1: 直接批量删除所有数据（最简单的方法）
    try {
      console.log('尝试方法1: 直接批量删除');
      const deleteResult = await db.collection('orders').where({
        _id: _.exists(true) // 匹配所有有_id字段的文档
      }).remove();
      
      console.log('直接批量删除结果:', deleteResult);
      
      // 检查是否完全删除
      const checkAfterBulkDelete = await db.collection('orders').count();
      if (checkAfterBulkDelete.total === 0) {
        return {
          success: true,
          message: '成功清空所有订单',
          method: '批量删除',
          originalTotal: total,
          deleted: deleteResult.stats.removed
        };
      }
      
      console.log(`批量删除后仍有${checkAfterBulkDelete.total}条数据，尝试其他方法`);
    } catch (err) {
      console.error('批量删除失败:', err);
    }
    
    // 尝试方法2: 分批次删除数据
    console.log('尝试方法2: 分批次删除数据');
    let deleted = 0;
    let failedIds = [];
    
    try {
      // 计算需要的批次数
      const batchTimes = Math.ceil(total / MAX_LIMIT);
      
      for (let i = 0; i < batchTimes; i++) {
        // 获取一批数据
        const ordersList = await db.collection('orders')
          .limit(MAX_LIMIT)
          .get();
        
        if (ordersList.data.length === 0) {
          console.log(`批次${i+1}：无数据可删除`);
          break;
        }
        
        console.log(`批次${i+1}：获取到${ordersList.data.length}条数据准备删除`);
        
        // 创建删除任务
        const tasks = ordersList.data.map(order => {
          return db.collection('orders').doc(order._id).remove()
            .then(() => ({ success: true, id: order._id }))
            .catch(err => {
              console.error(`删除订单${order._id}失败:`, err);
              return { success: false, id: order._id, error: err };
            });
        });
        
        // 执行批量删除并记录结果
        if (tasks.length > 0) {
          const results = await Promise.all(tasks);
          const successCount = results.filter(r => r.success).length;
          deleted += successCount;
          
          // 记录失败的ID
          const failedResults = results.filter(r => !r.success);
          failedIds = [...failedIds, ...failedResults.map(r => r.id)];
          
          console.log(`批次${i+1}：成功删除${successCount}条订单，失败${failedResults.length}条`);
        }
      }
    } catch (batchErr) {
      console.error('分批删除过程中出错:', batchErr);
    }
    
    // 最终检查，看是否还有订单剩余
    const finalCheck = await db.collection('orders').count();
    console.log(`最终检查: 剩余${finalCheck.total}条订单`);
    
    // 返回操作结果
    if (finalCheck.total === 0) {
      return {
        success: true,
        message: '成功清空所有订单',
        method: '分批删除',
        originalTotal: total,
        deleted: deleted
      };
    } else {
      // 有剩余数据，但已删除一部分
      if (deleted > 0) {
        return {
          success: true,
          message: `部分删除成功，已删除${deleted}条订单，剩余${finalCheck.total}条`,
          method: '分批删除',
          originalTotal: total,
          deleted: deleted,
          remaining: finalCheck.total,
          failedIds: failedIds.slice(0, 10) // 只返回前10个失败ID以避免返回体过大
        };
      } else {
        // 完全没删除成功
        return {
          success: false,
          message: '清空订单失败，无法删除数据',
          originalTotal: total,
          remaining: finalCheck.total
        };
      }
    }
  } catch (error) {
    console.error('清空订单时出错:', error);
    return {
      success: false,
      message: '清空订单失败: ' + error.message,
      error: error
    };
  }
} 