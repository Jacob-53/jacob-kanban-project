'use client';

import { useParams } from 'next/navigation';
import HelpRequestDetail from '@/components/common/HelpRequestDetail';

export default function HelpRequestDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  return (
    <div className="p-6">
      <HelpRequestDetail id={id} />
    </div>
  );
}
