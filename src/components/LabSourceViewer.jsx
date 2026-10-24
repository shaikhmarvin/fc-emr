import { useEffect, useRef, useState } from 'react';

export default function LabSourceViewer({ source, file, activeLab, onAttachSource, onReviewPage, reviewedPages = [] }) {
  const [pageNumber, setPageNumber] = useState(source?.pages?.[0]?.pageNumber || 1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const canvasRef = useRef(null);
  const documentRef = useRef(null);
  const renderRef = useRef(null);

  useEffect(() => {
    if (activeLab?.sourcePage) setPageNumber(activeLab.sourcePage);
  }, [activeLab]);
  useEffect(() => {
    setPageNumber(source?.pages?.[0]?.pageNumber || 1);
  }, [source]);
  useEffect(() => {
    let cancelled = false;
    setError('');
    documentRef.current = null;
    setImageUrl('');
    if (!file) return;
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    let pdf;
    (async () => {
      setLoading(true);
      try {
        const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker?url')]);
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        if (cancelled) { await pdf.destroy(); return; }
        documentRef.current = pdf;
        setLoading(false);
      } catch {
        if (!cancelled) { setError('Could not display the original PDF.'); setLoading(false); }
      }
    })();
    return () => {
      cancelled = true;
      renderRef.current?.cancel();
      documentRef.current = null;
      pdf?.destroy();
    };
  }, [file]);

  useEffect(() => {
    if (loading || !documentRef.current || !canvasRef.current) return;
    let cancelled = false;
    let task;
    (async () => {
      try {
        const page = await documentRef.current.getPage(pageNumber);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        canvas.width = viewport.width; canvas.height = viewport.height;
        task = page.render({ canvasContext: canvas.getContext('2d'), viewport });
        renderRef.current = task;
        await task.promise;
        setError('');
      } catch (reason) {
        if (!cancelled && reason.name !== 'RenderingCancelledException') setError('Could not display this page.');
      }
    })();
    return () => { cancelled = true; task?.cancel(); };
  }, [pageNumber, loading, file]);

  if (!source) return <section className="h-[85vh] min-h-[32rem] min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-lg font-semibold">Original report</h2><p className="mt-3 text-sm text-slate-500">This older import has extracted text only. New uploads include source page review.</p></section>;
  const page = source.pages?.find(item => item.pageNumber === pageNumber);
  const box = activeLab?.sourcePage === pageNumber ? activeLab.sourceBox : null;
  return (
    <section className="flex h-[85vh] min-h-[32rem] min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="h-44 shrink-0 overflow-auto pb-3">
      <h2 className="text-lg font-semibold">Original report</h2>
      <p className="mt-1 break-words text-xs text-slate-500">{source.name}</p>
      <div className="my-3 flex flex-wrap items-center gap-2">
        <label className="text-sm">Page
          <select aria-label="Source page" className="ml-2 rounded border border-slate-300 p-1" value={pageNumber} onChange={event => setPageNumber(Number(event.target.value))}>
            {(source.pages || []).map(item => <option key={item.pageNumber} value={item.pageNumber}>{item.pageNumber}{item.warning ? ' — check page' : ''}</option>)}
          </select>
        </label>
        <span className="text-xs text-slate-500">{source.pageCount} pages in file</span>
      </div>
      {page?.warning && <p className="mb-3 rounded bg-amber-50 p-2 text-sm text-amber-800">{page.warning}</p>}
      {error && <p role="alert" className="mb-2 text-sm text-red-700">{error}</p>}
      </div>
      {!file ? <div className="space-y-2 text-sm text-slate-600">
        <p>The shared original is unavailable or has been removed after review completion. You can reattach the original file to view it.</p>
        <input aria-label="Reattach original report" type="file" accept="application/pdf,image/*" onChange={async event => {
          const selected = event.target.files?.[0];
          if (!selected) return;
          try { await onAttachSource?.(selected); setError(''); } catch (reason) { setError(reason.message); }
          event.target.value = '';
        }} />
      </div> : <>
        {loading && <p role="status" className="mb-2 text-sm">Opening source…</p>}
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain rounded border border-slate-200 bg-slate-100">
          <div className="relative">
            {imageUrl ? <img src={imageUrl} alt={`Original report page ${pageNumber}`} className="block w-full" /> : <canvas ref={canvasRef} aria-label={`Original report page ${pageNumber}`} className="block w-full" />}
            {box && <div aria-label="Selected result on source page" className="pointer-events-none absolute border-2 border-blue-600 bg-yellow-300/30" style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%` }} />}
          </div>
        </div>
        <label className="flex h-16 shrink-0 items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={reviewedPages.includes(pageNumber)} onChange={event => onReviewPage?.(pageNumber, event.target.checked)} />
          I checked this page for missing results and patient details.
        </label>
      </>}
    </section>
  );
}
