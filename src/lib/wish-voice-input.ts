import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { tripWishesApi } from '@/api/trip-wishes';
import type { WishCategory } from '@/types/trip-wishes';
import { importanceLevel } from '@/lib/wishlist-model';

export interface VoiceTranscribeDraft {
  voiceTranscriptId: string;
  text: string;
  category: WishCategory;
  importance: 1 | 2 | 3 | 4 | 5;
}

interface UseWishVoiceInputOptions {
  tripId: string;
  onTranscribed?: (draft: VoiceTranscribeDraft) => void;
}

export function useWishVoiceInput({ tripId, onTranscribed }: UseWishVoiceInputOptions) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopTracks = useCallback(() => {
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => () => stopTracks(), [stopTracks]);

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.message('当前浏览器不支持录音，请改用文字输入');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stopTracks();
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size === 0) {
          toast.error('未录到音频，请重试');
          return;
        }
        setTranscribing(true);
        try {
          const ext = blob.type.includes('mp4') ? 'recording.mp4' : 'recording.webm';
          const result = await tripWishesApi.transcribeVoice(tripId, blob, {
            language: 'zh-CN',
            format: blob.type,
            filename: ext,
          });
          onTranscribed?.({
            voiceTranscriptId: result.voiceTranscriptId,
            text: result.suggestedDraft.text,
            category: result.suggestedDraft.category,
            importance: importanceLevel(result.suggestedDraft.importance),
          });
        } catch (e) {
          toast.error((e as Error).message ?? '语音转写失败');
        } finally {
          setTranscribing(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      toast.error('无法访问麦克风，请检查权限');
    }
  }, [tripId, onTranscribed, stopTracks]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    setRecording(false);
  }, []);

  return { recording, transcribing, startRecording, stopRecording };
}
