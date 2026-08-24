import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, ExternalLink } from 'lucide-react';

const QRCodeModal = ({ isOpen, onClose, product }) => {
    if (!isOpen || !product) return null;

    // Create URL for the product view page
    const baseUrl = window.location.origin;
    const productUrl = `${baseUrl}/product/${product.sn}`;

    const handleDownload = () => {
        const svg = document.getElementById('qr-code-svg');
        if (svg) {
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                const pngFile = canvas.toDataURL('image/png');
                const downloadLink = document.createElement('a');
                downloadLink.download = `QR-${product.sn}.png`;
                downloadLink.href = pngFile;
                downloadLink.click();
            };
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Product QR Code</h2>
                    <button onClick={onClose} className="text-white hover:text-white/80 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col items-center">
                    <div className="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm mb-4">
                        <QRCodeSVG
                            id="qr-code-svg"
                            value={productUrl}
                            size={200}
                            level="M"
                            includeMargin={true}
                        />
                    </div>

                    <div className="text-center mb-4">
                        <p className="font-bold text-slate-900">{product.sn}</p>
                        <p className="text-slate-600">{product.productName}</p>
                    </div>

                    {/* URL Display */}
                    <div className="w-full bg-slate-50 rounded-lg p-3 mb-4">
                        <p className="text-xs text-slate-500 mb-1">Scan URL:</p>
                        <div className="flex items-center gap-2">
                            <a
                                href={productUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex-1 break-all font-mono"
                            >
                                {productUrl}
                            </a>
                            <a
                                href={productUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-500 hover:text-blue-600 p-1 transition-colors"
                                title="Open in new tab"
                            >
                                <ExternalLink size={16} />
                            </a>
                        </div>
                    </div>

                    <button
                        onClick={handleDownload}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md"
                    >
                        <Download size={18} />
                        Download QR Code
                    </button>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-6 py-3 text-center text-xs text-slate-500">
                    Scan this QR code to view product details
                </div>
            </div>
        </div>
    );
};

export default QRCodeModal;
