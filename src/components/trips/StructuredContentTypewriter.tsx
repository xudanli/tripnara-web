/**
 * 结构化内容的打字机效果
 * 
 * 支持渐进式显示结构化内容块，提供更好的用户体验
 */

import { useState, useEffect, useRef } from 'react';
import { ResponseBlockRenderer } from './ResponseBlockRenderer';
import type { PlannerResponseBlock } from '@/types/trip';

interface StructuredContentTypewriterProps {
  blocks: PlannerResponseBlock[];
  enabled: boolean;
  speed?: number; // 每个字符的延迟（毫秒）
  blockDelay?: number; // 每个块之间的延迟（毫秒）
  onComplete?: () => void;
}

/**
 * 结构化内容打字机效果组件
 * 
 * 策略：
 * - 对于 paragraph 类型：逐字符显示
 * - 对于其他类型（heading, list, card等）：整块显示，但按顺序渐进出现
 */
export function StructuredContentTypewriter({
  blocks,
  enabled,
  speed = 25,
  blockDelay = 200,
  onComplete,
}: StructuredContentTypewriterProps) {
  const [displayedBlocks, setDisplayedBlocks] = useState<PlannerResponseBlock[]>([]);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [_currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // 🐛 使用 useRef 存储 onComplete 回调，避免依赖项变化导致重复触发
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  
  // 🐛 使用 useRef 跟踪是否已经初始化，防止重复触发
  const initializedRef = useRef(false);
  const blocksRef = useRef<PlannerResponseBlock[]>([]);

  useEffect(() => {
    if (!enabled) {
      // 禁用打字机效果，直接显示所有内容
      setDisplayedBlocks(blocks);
      setCurrentBlockIndex(blocks.length);
      setIsTyping(false);
      initializedRef.current = false;
      blocksRef.current = blocks;
      onCompleteRef.current?.();
      return;
    }

    // 🐛 防止重复触发：检查 blocks 是否真的变化了
    const blocksChanged = 
      blocks.length !== blocksRef.current.length ||
      blocks.some((block, idx) => block.id !== blocksRef.current[idx]?.id);
    
    // 如果已经初始化且 blocks 没有变化，则不重复触发
    if (initializedRef.current && !blocksChanged) {
      return;
    }

    // 重置状态
    setDisplayedBlocks([]);
    setCurrentBlockIndex(0);
    setCurrentText('');
    setIsTyping(true);
    initializedRef.current = true;
    blocksRef.current = blocks;

    let blockIndex = 0;
    let textIndex = 0;
    const currentBlocks: PlannerResponseBlock[] = [];
    let timeoutId: NodeJS.Timeout | null = null;

    const processNextBlock = () => {
      if (blockIndex >= blocks.length) {
        // 所有块都处理完成
        setIsTyping(false);
        onCompleteRef.current?.();
        return;
      }

      const block = blocks[blockIndex];

      // 如果是 paragraph 类型，需要逐字符显示
      if (block.type === 'paragraph' && block.content) {
        const content = block.content;
        
        // 逐字符显示
        const typeText = () => {
          if (textIndex < content.length) {
            // 每次添加 1-3 个字符，模拟更自然的打字
            const charsToAdd = Math.min(
              Math.floor(Math.random() * 2) + 1,
              content.length - textIndex
            );
            const newText = content.slice(0, textIndex + charsToAdd);
            setCurrentText(newText);
            textIndex += charsToAdd;
            
            // 更新当前块的内容
            const updatedBlock: PlannerResponseBlock = {
              ...block,
              content: newText,
            };
            setDisplayedBlocks([...currentBlocks, updatedBlock]);
            
            timeoutId = setTimeout(typeText, speed);
          } else {
            // 当前段落完成，移动到下一个块
            currentBlocks.push(block);
            setDisplayedBlocks([...currentBlocks]);
            setCurrentText('');
            textIndex = 0;
            blockIndex++;
            setCurrentBlockIndex(blockIndex);
            
            // 延迟后处理下一个块
            timeoutId = setTimeout(processNextBlock, blockDelay);
          }
        };
        
        typeText();
      } else {
        // 非 paragraph 类型，整块显示
        currentBlocks.push(block);
        setDisplayedBlocks([...currentBlocks]);
        blockIndex++;
        setCurrentBlockIndex(blockIndex);
        
        // 延迟后处理下一个块
        timeoutId = setTimeout(processNextBlock, blockDelay);
      }
    };

    // 开始处理第一个块
    processNextBlock();

    // 清理函数：取消未完成的定时器
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // 🐛 清理时重置初始化状态
      initializedRef.current = false;
    };
  }, [blocks, enabled, speed, blockDelay]); // 🐛 移除 onComplete 依赖，使用 useRef 存储

  return (
    <div className="space-y-3">
      {displayedBlocks.map((block, idx) => {
        // 跳过 question_card 类型，它们会在父组件中单独渲染
        if (block.type === 'question_card') return null;
        
        return (
          <ResponseBlockRenderer 
            key={block.id || `block-${idx}`} 
            block={block} 
            allBlocks={blocks}
          />
        );
      })}
      {/* 打字光标（仅在最后一个 paragraph 块打字时显示） */}
      {isTyping && currentBlockIndex < blocks.length && blocks[currentBlockIndex]?.type === 'paragraph' && (
        <span className="inline-block w-0.5 h-4 bg-slate-600 ml-0.5 animate-pulse" />
      )}
    </div>
  );
}
