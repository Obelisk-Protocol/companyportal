import { useState, useRef, useEffect } from 'react';
import { X, Save, Plus } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

interface SignatureField {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  type: 'client' | 'employee' | 'company';
}

interface PdfSignaturePlacementProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  documentUrl: string;
  onSave: (signatureFields: {
    clientSignatureField?: SignatureField;
    employeeSignatureField?: SignatureField;
    companySignatureField?: SignatureField;
  }) => void;
  existingFields?: {
    clientSignatureField?: SignatureField;
    employeeSignatureField?: SignatureField;
    companySignatureField?: SignatureField;
  };
  contractCategory: 'client' | 'employee';
}

export default function PdfSignaturePlacement({
  isOpen,
  onClose,
  contractId,
  documentUrl,
  onSave,
  existingFields,
  contractCategory,
}: PdfSignaturePlacementProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeFieldType, setActiveFieldType] = useState<'client' | 'employee' | 'company' | null>(null);
  const [fields, setFields] = useState<{
    clientSignatureField?: SignatureField;
    employeeSignatureField?: SignatureField;
    companySignatureField?: SignatureField;
  }>(existingFields || {});
  const [dragging, setDragging] = useState<{ type: string; offsetX: number; offsetY: number } | null>(null);
  const [pdfScale, setPdfScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    if (existingFields) {
      setFields(existingFields);
    }
  }, [existingFields]);

  const handlePdfClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeFieldType || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / pdfScale;
    const y = (e.clientY - rect.top) / pdfScale;

    const newField: SignatureField = {
      pageIndex: currentPage,
      x: Math.max(0, x - 100), // Center the box on click
      y: Math.max(0, y - 40),
      width: 200,
      height: 80,
      label: activeFieldType === 'client' || activeFieldType === 'employee' 
        ? `${activeFieldType === 'client' ? 'Client' : 'Employee'} Signature`
        : 'Company Signature',
      type: activeFieldType,
    };

    setFields((prev) => ({
      ...prev,
      [`${activeFieldType}SignatureField`]: newField,
    }));

    setActiveFieldType(null);
  };

  const handleFieldDrag = (e: React.MouseEvent, type: string) => {
    if (!containerRef.current) return;

    const fieldKey = `${type}SignatureField` as keyof typeof fields;
    const field = fields[fieldKey];
    if (!field) return;

    const rect = containerRef.current.getBoundingClientRect();
    const startX = (e.clientX - rect.left) / pdfScale - field.x;
    const startY = (e.clientY - rect.top) / pdfScale - field.y;

    setDragging({ type, offsetX: startX, offsetY: startY });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      const moveRect = containerRef.current.getBoundingClientRect();
      const newX = (moveEvent.clientX - moveRect.left) / pdfScale - startX;
      const newY = (moveEvent.clientY - moveRect.top) / pdfScale - startY;

      setFields((prev) => {
        const currentField = prev[fieldKey];
        if (!currentField) return prev;
        return {
          ...prev,
          [fieldKey]: {
            ...currentField,
            x: Math.max(0, newX),
            y: Math.max(0, newY),
          },
        };
      });
    };

    const handleMouseUp = () => {
      setDragging(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const removeField = (type: 'client' | 'employee' | 'company') => {
    const fieldKey = `${type}SignatureField` as keyof typeof fields;
    setFields((prev) => {
      const updated = { ...prev };
      delete updated[fieldKey];
      return updated;
    });
  };

  const handleSave = () => {
    onSave(fields);
    onClose();
  };

  const getFieldColor = (type: string) => {
    switch (type) {
      case 'client':
        return 'border-blue-500 bg-blue-500/20';
      case 'employee':
        return 'border-green-500 bg-green-500/20';
      case 'company':
        return 'border-purple-500 bg-purple-500/20';
      default:
        return 'border-gray-500 bg-gray-500/20';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Place Signature Fields" size="xl">
      <div className="space-y-4">
        {/* Instructions */}
        <div className="bg-neutral-800 p-4 rounded-lg">
          <p className="text-sm text-neutral-300 mb-2">
            1. Select a signature field type below
          </p>
          <p className="text-sm text-neutral-300 mb-2">
            2. Click on the PDF where you want to place the signature field
          </p>
          <p className="text-sm text-neutral-300">
            3. Drag placed fields to reposition them, or click X to remove
          </p>
        </div>

        {/* Field Type Selector */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={activeFieldType === 'client' || activeFieldType === 'employee' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => {
              const type = contractCategory === 'client' ? 'client' : 'employee';
              setActiveFieldType(type);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {contractCategory === 'client' ? 'Client' : 'Employee'} Signature
          </Button>
          <Button
            variant={activeFieldType === 'company' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveFieldType('company')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Company Signature
          </Button>
          {activeFieldType && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveFieldType(null)}
            >
              Cancel
            </Button>
          )}
        </div>

        {/* PDF Viewer with Overlays */}
        <div
          ref={containerRef}
          className="relative border border-neutral-700 rounded-lg overflow-auto bg-neutral-900"
          style={{ height: '600px' }}
          onClick={handlePdfClick}
        >
          <div className="relative" style={{ transform: `scale(${pdfScale})`, transformOrigin: 'top left' }}>
            <iframe
              ref={iframeRef}
              src={documentUrl}
              className="w-full"
              style={{ height: '800px', border: 'none' }}
              title="Contract PDF"
            />
            
            {/* Signature Field Overlays */}
            {fields.clientSignatureField && fields.clientSignatureField.pageIndex === currentPage && (
              <div
                className={`absolute border-2 ${getFieldColor('client')} cursor-move p-2`}
                style={{
                  left: `${fields.clientSignatureField.x}px`,
                  top: `${fields.clientSignatureField.y}px`,
                  width: `${fields.clientSignatureField.width}px`,
                  height: `${fields.clientSignatureField.height}px`,
                }}
                onMouseDown={(e) => handleFieldDrag(e, 'client')}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-blue-400">
                    {fields.clientSignatureField.label || 'Client Signature'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeField('client');
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-xs text-neutral-400 mt-2">Click and drag to move</div>
              </div>
            )}

            {fields.employeeSignatureField && fields.employeeSignatureField.pageIndex === currentPage && (
              <div
                className={`absolute border-2 ${getFieldColor('employee')} cursor-move p-2`}
                style={{
                  left: `${fields.employeeSignatureField.x}px`,
                  top: `${fields.employeeSignatureField.y}px`,
                  width: `${fields.employeeSignatureField.width}px`,
                  height: `${fields.employeeSignatureField.height}px`,
                }}
                onMouseDown={(e) => handleFieldDrag(e, 'employee')}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-green-400">
                    {fields.employeeSignatureField.label || 'Employee Signature'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeField('employee');
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-xs text-neutral-400 mt-2">Click and drag to move</div>
              </div>
            )}

            {fields.companySignatureField && fields.companySignatureField.pageIndex === currentPage && (
              <div
                className={`absolute border-2 ${getFieldColor('company')} cursor-move p-2`}
                style={{
                  left: `${fields.companySignatureField.x}px`,
                  top: `${fields.companySignatureField.y}px`,
                  width: `${fields.companySignatureField.width}px`,
                  height: `${fields.companySignatureField.height}px`,
                }}
                onMouseDown={(e) => handleFieldDrag(e, 'company')}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-purple-400">
                    {fields.companySignatureField.label || 'Company Signature'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeField('company');
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-xs text-neutral-400 mt-2">Click and drag to move</div>
              </div>
            )}
          </div>

          {/* Active Cursor Indicator */}
          {activeFieldType && (
            <div className="absolute top-4 right-4 bg-primary text-[var(--text-primary)] px-4 py-2 rounded-lg shadow-lg z-50">
              <p className="text-sm font-semibold">
                Click on PDF to place {activeFieldType === 'client' || activeFieldType === 'employee' 
                  ? activeFieldType === 'client' ? 'Client' : 'Employee'
                  : 'Company'} Signature Field
              </p>
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPdfScale(Math.max(0.5, pdfScale - 0.1))}
            >
              Zoom Out
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPdfScale(1)}
            >
              Reset ({Math.round(pdfScale * 100)}%)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPdfScale(Math.min(2, pdfScale + 0.1))}
            >
              Zoom In
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-neutral-700">
          <Button
            onClick={handleSave}
            disabled={!fields.clientSignatureField && !fields.employeeSignatureField && !fields.companySignatureField}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Signature Fields
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
