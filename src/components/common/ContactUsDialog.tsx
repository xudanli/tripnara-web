import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Mail, Send, X } from 'lucide-react';
import { contactApi } from '@/api/contact';

interface ContactUsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactUsDialog({ open, onOpenChange }: ContactUsDialogProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setError(t('contactUs.invalidImageFormat', { defaultValue: '请选择图片文件' }));
      return;
    }

    // 限制最多上传5张图片
    const newImages = [...images, ...imageFiles].slice(0, 5);
    setImages(newImages);
    setError(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const imageFiles: File[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      const newImages = [...images, ...imageFiles].slice(0, 5);
      setImages(newImages);
      setError(null);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && images.length === 0) {
      setError(t('contactUs.messageOrImageRequired', { defaultValue: '请输入消息或上传图片' }));
      return;
    }

    if (uploading) return;

    try {
      setUploading(true);
      setError(null);

      await contactApi.sendMessage({
        message: message.trim() || undefined,
        images: images.length > 0 ? images : undefined,
      });

      setSuccess(true);
      setMessage('');
      setImages([]);
      
      // 3秒后关闭对话框
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || t('contactUs.sendFailed', { defaultValue: '发送失败，请稍后重试' }));
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setMessage('');
      setImages([]);
      setError(null);
      setSuccess(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        onPaste={handlePaste}
      >
        <DialogHeader>
          <DialogTitle>{t('contactUs.title', { defaultValue: '联系我们' })}</DialogTitle>
          <DialogDescription>
            {t('contactUs.description', {
              defaultValue: '期待您的反馈。您可以向我们报告错误、提出问题或分享想法。',
            })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 消息输入框 */}
          <div className="space-y-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('contactUs.messagePlaceholder', {
                defaultValue: '发现了错误或有好的想法要分享......',
              })}
              className="min-h-[120px] resize-none"
              disabled={uploading || success}
            />
          </div>

          {/* 图片上传区域 */}
          <div className="space-y-2">
            <Label>{t('contactUs.uploadImages', { defaultValue: '上传图片或从剪贴板粘贴图片。' })}</Label>
            <div
              ref={imagePreviewRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-gray-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileInputChange}
                className="hidden"
                disabled={uploading || success || images.length >= 5}
              />
              
              {images.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <Plus className="w-12 h-12 mb-2" />
                  <p className="text-sm">{t('contactUs.clickToUpload', { defaultValue: '点击上传或拖拽图片' })}</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(index);
                        }}
                        className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={uploading || success}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {images.length < 5 && (
                    <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400">
                      <Plus className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* 成功提示 */}
          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              {t('contactUs.sendSuccess', { defaultValue: '消息发送成功！我们会尽快回复您。' })}
            </div>
          )}

          {/* 联系方式 */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="bg-black text-white px-3 py-1 rounded text-sm">
                {t('contactUs.contactByEmail', { defaultValue: '通过邮件联系我们:' })}{' '}
                <a
                  href="mailto:contact@tripnara.com"
                  className="underline hover:no-underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  contact@tripnara.com
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://discord.gg/your-discord-link"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">D</span>
                </div>
                <span className="text-sm">Discord</span>
              </a>
              <a
                href="mailto:contact@tripnara.com"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                onClick={(e) => e.stopPropagation()}
              >
                <Mail className="w-5 h-5" />
                <span className="text-sm">{t('contactUs.email', { defaultValue: '邮件' })}</span>
              </a>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
            >
              {t('contactUs.cancel', { defaultValue: '取消' })}
            </Button>
            <Button type="submit" disabled={uploading || success}>
              {uploading ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  {t('contactUs.sending', { defaultValue: '发送中...' })}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {t('contactUs.sendMessage', { defaultValue: '发送消息' })} →
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

