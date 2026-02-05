/**
 * 空状态图片组件使用示例
 * 
 * 展示如何在项目中使用空状态图片组件
 */

import { EmptyStateImage, EmptyStateCard, type EmptyStateType } from './empty-state-images';
import { Button } from './button';

// 示例1：单独使用图片
export function Example1() {
  return (
    <div className="flex gap-4">
      <EmptyStateImage type="no-recommended-places" width={150} height={150} />
      <EmptyStateImage type="no-arrangements" width={150} height={150} />
      <EmptyStateImage type="no-itinerary-items" width={150} height={150} />
      <EmptyStateImage type="no-trip-added" width={150} height={150} />
    </div>
  );
}

// 示例2：使用完整的卡片组件（带标题、描述和操作按钮）
export function Example2() {
  return (
    <EmptyStateCard
      type="no-trip-added"
      title="你还没有添加任何行程哦~"
      description="创建您的第一个行程，开始规划您的旅行"
      action={
        <Button onClick={() => console.log('创建行程')}>
          创建行程
        </Button>
      }
    />
  );
}

// 示例3：在现有组件中替换空状态
export function Example3() {
  const hasItems = false; // 假设没有数据

  if (!hasItems) {
    return (
      <EmptyStateCard
        type="no-itinerary-items"
        title="暂无行程项"
        description="一个行程项可以是景点、美食、住宿或交通。试着添加第一站吧！"
        action={
          <Button onClick={() => console.log('添加行程项')}>
            添加行程项
          </Button>
        }
      />
    );
  }

  return <div>行程项列表...</div>;
}

// 示例4：自定义样式
export function Example4() {
  return (
    <EmptyStateCard
      type="no-arrangements"
      title="该日暂无安排"
      description="为这一天添加一些活动吧"
      className="border-2 border-dashed border-gray-300 rounded-lg"
      imageWidth={180}
      imageHeight={180}
      action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => console.log('查看推荐')}>
            查看推荐
          </Button>
          <Button onClick={() => console.log('添加活动')}>
            添加活动
          </Button>
        </div>
      }
    />
  );
}
