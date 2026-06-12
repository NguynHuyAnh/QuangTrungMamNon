import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type ModalPortalLayer = 'default' | 'stack' | 'top';

const layerClass: Record<ModalPortalLayer, string> = {
  default: 'z-[1200]',
  stack: 'z-[1210]',
  top: 'z-[1220]',
};

export type ModalPortalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Không đóng khi bấm nền (đang lưu, v.v.) */
  lockBackdrop?: boolean;
  /** Lớp nền (mặc định đồng bộ trang Users) */
  backdropClassName?: string;
  /** Khối chứa nội dung modal — rộng tối đa, không co */
  panelWrapperClassName?: string;
  /** Chồng modal (ghi đè / confirm) */
  layer?: ModalPortalLayer;
};

/**
 * Modal gắn vào document.body để không bị lệch bởi transform/scroll của AdminLayout hay ParentLayout.
 */
export function ModalPortal({
  open,
  onClose,
  children,
  lockBackdrop = false,
  backdropClassName = 'bg-slate-900/45 backdrop-blur-[1px]',
  panelWrapperClassName = 'my-auto w-full max-w-lg shrink-0',
  layer = 'default',
}: ModalPortalProps) {
  if (!open || typeof document === 'undefined') return null;

  const z = layerClass[layer];

  return createPortal(
    <div
      role="presentation"
      className={`fixed inset-0 ${z} overflow-y-auto ${backdropClassName}`}
      onClick={() => {
        if (!lockBackdrop) onClose();
      }}
    >
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-10 sm:py-12">
        <div className={panelWrapperClassName} onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
