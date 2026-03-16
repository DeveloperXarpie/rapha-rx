import { resolveAsset, resolvePanelClass } from '../lib/assets/catalog';

interface AssetPanelProps {
  assetId: string;
  label: string;
  gameId: string;
  panelColorClass?: string;
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
}

export default function AssetPanel({
  assetId,
  label,
  gameId,
  panelColorClass,
  className = '',
  iconClassName = 'text-4xl',
  labelClassName = 'text-body-md font-semibold text-body-text',
}: AssetPanelProps) {
  const asset = resolveAsset(assetId);
  const panelClass = resolvePanelClass(gameId, panelColorClass);

  return (
    <div className={`${panelClass} ${className} border border-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]`}>
      <div className="w-12 h-12 rounded-xl border border-slate-200 bg-[#eaf0fa] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        {asset?.imageSrc ? (
          <img src={asset.imageSrc} alt={label} className="w-10 h-10 object-contain" />
        ) : (
          <span className={iconClassName}>{asset?.token ?? '❔'}</span>
        )}
      </div>
      <span className={labelClassName}>{label}</span>
    </div>
  );
}
