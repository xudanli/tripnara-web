/**
 * 创建行程入口页
 */

import { CreateTripEntryPicker } from '@/components/guide-import/CreateTripEntryPicker';
import { GuideImportPageShell } from '@/components/guide-import/guide-import-ui';

export default function NewTripPage() {
  return (
    <GuideImportPageShell className="min-h-full">
      <CreateTripEntryPicker showPageTitle />
    </GuideImportPageShell>
  );
}
