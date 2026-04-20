import React from 'react';
import { ExternalLink, AlertCircle, BadgeInfo } from 'lucide-react';
import { buildBioDigitalViewerUrl, resolveBioDigitalModel } from '../lib/biodigital.ts';

interface BioDigitalViewerPanelProps {
  topic: string;
  moduleTitle: string;
  curriculumTitle: string;
}

const BioDigitalViewerPanel: React.FC<BioDigitalViewerPanelProps> = ({
  topic,
  moduleTitle,
  curriculumTitle,
}) => {
  const selection = resolveBioDigitalModel(topic, moduleTitle, curriculumTitle);

  if (!selection) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">3D BioDigital Model</h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-300">
          No biology model was auto-matched for this topic. Add a custom topic-to-model mapping in
          VITE_BIODIGITAL_TOPIC_MODEL_MAP to support it.
        </p>
      </div>
    );
  }

  const viewerUrl = buildBioDigitalViewerUrl(selection.modelId);

  if (!viewerUrl) {
    return (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-900/10 p-5">
        <div className="flex items-start gap-2 mb-2">
          <AlertCircle size={16} className="text-amber-600 mt-0.5" />
          <h3 className="text-sm font-bold text-amber-700 dark:text-amber-300">BioDigital key missing</h3>
        </div>
        <p className="text-xs text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
          Add VITE_BIODIGITAL_DEVELOPER_KEY in your .env file to render interactive 3D anatomy.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Interactive 3D Model</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">{selection.label}</p>
        </div>
        <a
          href={viewerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-peach hover:underline"
        >
          Open <ExternalLink size={13} />
        </a>
      </div>

      <div className="aspect-[16/10] w-full bg-zinc-100 dark:bg-zinc-800">
        <iframe
          src={viewerUrl}
          title={`BioDigital model: ${selection.modelId}`}
          className="w-full h-full border-0"
          loading="lazy"
          allow="fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>

      <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40">
        <p className="text-[11px] text-zinc-600 dark:text-zinc-300 flex items-start gap-2">
          <BadgeInfo size={14} className="mt-0.5 flex-shrink-0" />
          Topic-model matching can be improved with VITE_BIODIGITAL_TOPIC_MODEL_MAP in .env.
        </p>
      </div>
    </div>
  );
};

export default BioDigitalViewerPanel;
