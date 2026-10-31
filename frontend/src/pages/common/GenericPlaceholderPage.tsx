import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, EmptyState, Breadcrumbs } from '@/components/ui';

interface GenericPlaceholderPageProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  entityName: string;
}

export const GenericPlaceholderPage: React.FC<GenericPlaceholderPageProps> = ({
  title,
  description,
  icon,
  entityName,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <Breadcrumbs items={[{ label: title }]} />
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
        <p className="text-xs text-slate-500">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{title} Overview</CardTitle>
            <CardDescription>
              Backend API contract verification pending with Amarnadh & Harsha.
            </CardDescription>
          </div>
        </CardHeader>
        <div className="pt-4">
          <EmptyState
            icon={icon}
            title={`No ${entityName} configured yet`}
            description={`Phase 1A has established the foundation and visual layout. Live data and operations will activate upon Phase 1B backend connection.`}
            actionLabel={`Create ${entityName}`}
            onAction={() => alert(`${entityName} modal will connect to backend API in Phase 1B.`)}
          />
        </div>
      </Card>
    </div>
  );
};

