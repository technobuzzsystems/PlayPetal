import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Switch } from '../components/ui/Switch';
import { useAdmin } from '../context/AdminContext';
import { useToast } from '../context/ToastContext';
import {
  ArrowUp,
  ArrowDown,
  LayoutTemplate,
  GripVertical,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

export const HomepageCMS: React.FC = () => {
  const { cmsSections, toggleCMSSection, moveCMSSection } = useAdmin();
  const { showToast } = useToast();

  const handleToggle = (id: string, name: string, currentState: boolean) => {
    toggleCMSSection(id);
    showToast(
      `Section "${name}" ${!currentState ? 'enabled' : 'hidden from storefront'}`,
      'info'
    );
  };

  const handleMove = (id: string, name: string, direction: 'up' | 'down') => {
    moveCMSSection(id, direction);
    showToast(`Moved "${name}" ${direction}`, 'info');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homepage CMS & Layout Builder"
        description="Arrange, toggle, and reorder storefront sections for the customer website"
        breadcrumbs={[{ label: 'Content', href: '/admin/homepage' }, { label: 'Homepage CMS' }]}
        actions={
          <Button
            onClick={() => showToast('Homepage layout arrangement published!', 'success')}
            leftIcon={<Check className="w-4 h-4" />}
          >
            Publish Storefront Layout
          </Button>
        }
      />

      <Card>
        <CardHeader className="flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-indigo-600" />
            <CardTitle>Front Page Section Hierarchy</CardTitle>
          </div>
          <span className="text-xs text-slate-500">
            {cmsSections.filter((s) => s.enabled).length} of {cmsSections.length} sections visible
          </span>
        </CardHeader>

        <CardContent className="space-y-3">
          {cmsSections.map((sec, idx) => (
            <div
              key={sec.id}
              className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 ${
                sec.enabled
                  ? 'bg-white border-slate-200/90 shadow-2xs'
                  : 'bg-slate-50/70 border-dashed border-slate-200 opacity-60'
              }`}
            >
              {/* Order index + grip */}
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-slate-300 cursor-grab shrink-0" />
                <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                  {sec.order}
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-slate-900">{sec.name}</h4>
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {sec.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{sec.title}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                {/* Reorder up/down buttons */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
                  <button
                    disabled={idx === 0}
                    onClick={() => handleMove(sec.id, sec.name, 'up')}
                    className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={idx === cmsSections.length - 1}
                    onClick={() => handleMove(sec.id, sec.name, 'down')}
                    className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Enable/Disable switch */}
                <div className="flex items-center gap-2">
                  {sec.enabled ? (
                    <Eye className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-400" />
                  )}
                  <Switch
                    checked={sec.enabled}
                    onChange={() => handleToggle(sec.id, sec.name, sec.enabled)}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
