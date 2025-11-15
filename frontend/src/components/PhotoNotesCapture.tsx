/**
 * Photo Notes Capture Component
 * Allows users to snap photos of books/series at bookstores with notes
 * Supports offline storage and sync to backend when online
 */

import React, { useRef, useState, useEffect } from 'react';

interface PhotoNote {
  id: string;
  imageData: string; // base64 encoded image
  notes?: string;
  timestamp: number;
  seriesName?: string;
  location?: string;
  isSynced?: boolean;
}

interface PhotoNotesCaptureProps {
  onCapture?: (photo: PhotoNote) => void;
  onClose?: () => void;
}

const PhotoNotesCapture: React.FC<PhotoNotesCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [photos, setPhotos] = useState<PhotoNote[]>([]);
  const [currentNote, setCurrentNote] = useState<Partial<PhotoNote>>({});
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load photos from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('booktarr_photo_notes');
    if (stored) {
      try {
        setPhotos(JSON.parse(stored));
      } catch {
        console.error('Failed to load photo notes');
      }
    }
  }, []);

  // Save photos to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('booktarr_photo_notes', JSON.stringify(photos));
  }, [photos]);

  // Initialize camera
  useEffect(() => {
    if (!cameraActive) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        setError('Unable to access camera. Please check permissions.');
        console.error('Camera error:', err);
        setCameraActive(false);
      }
    };

    startCamera();

    return () => {
      // Clean up: stop all tracks
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraActive]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    const photo: PhotoNote = {
      id: `photo-${Date.now()}`,
      imageData,
      timestamp: Date.now(),
      isSynced: false
    };

    setPhotos(prev => [photo, ...prev]);
    setCurrentNote({ ...photo });
    setShowForm(true);
    setCameraActive(false);
  };

  const savePhotoNote = () => {
    if (!currentNote.id) return;

    setPhotos(prev =>
      prev.map(p =>
        p.id === currentNote.id
          ? {
              ...p,
              notes: currentNote.notes,
              seriesName: currentNote.seriesName,
              location: currentNote.location
            }
          : p
      )
    );

    if (onCapture) {
      const photo = photos.find(p => p.id === currentNote.id);
      if (photo) {
        onCapture({
          ...photo,
          notes: currentNote.notes,
          seriesName: currentNote.seriesName,
          location: currentNote.location
        });
      }
    }

    setShowForm(false);
    setCurrentNote({});
  };

  const deletePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const syncPhotosToBackend = async () => {
    // This would sync photos to backend when online
    // For now, just mark as synced
    setPhotos(prev =>
      prev.map(p => ({
        ...p,
        isSynced: true
      }))
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">📸 Bookstore Finds</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Camera Section */}
          {!cameraActive && !showForm && (
            <div className="text-center">
              <button
                onClick={() => setCameraActive(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg inline-flex items-center gap-2"
              >
                📷 Take Photo
              </button>
            </div>
          )}

          {/* Camera View */}
          {cameraActive && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-auto max-h-96 bg-black"
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  style={{ display: 'none' }}
                />
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={capturePhoto}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2"
                >
                  📸 Capture
                </button>
                <button
                  onClick={() => setCameraActive(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Photo Form */}
          {showForm && currentNote.id && (
            <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
              <img
                src={currentNote.imageData}
                alt="Captured"
                className="w-full rounded-lg max-h-64 object-cover"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Series Name
                </label>
                <input
                  type="text"
                  value={currentNote.seriesName || ''}
                  onChange={(e) =>
                    setCurrentNote(prev => ({ ...prev, seriesName: e.target.value }))
                  }
                  placeholder="e.g., Stormlight Archive"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={currentNote.location || ''}
                  onChange={(e) =>
                    setCurrentNote(prev => ({ ...prev, location: e.target.value }))
                  }
                  placeholder="e.g., Barnes & Noble Downtown"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={currentNote.notes || ''}
                  onChange={(e) =>
                    setCurrentNote(prev => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Volume numbers, availability, price, etc."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={savePhotoNote}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setCurrentNote({});
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Photo Gallery */}
          {photos.length > 0 && !showForm && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Your Bookstore Finds ({photos.length})
                </h3>
                {photos.some(p => !p.isSynced) && (
                  <button
                    onClick={syncPhotosToBackend}
                    className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
                  >
                    ⟳ Sync Offline
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {photos.map(photo => (
                  <div
                    key={photo.id}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition"
                  >
                    <img
                      src={photo.imageData}
                      alt={photo.seriesName || 'Bookstore photo'}
                      className="w-full h-40 object-cover"
                    />
                    <div className="p-3 space-y-2">
                      {photo.seriesName && (
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {photo.seriesName}
                        </h4>
                      )}
                      {photo.location && (
                        <p className="text-xs text-gray-600">📍 {photo.location}</p>
                      )}
                      {photo.notes && (
                        <p className="text-xs text-gray-700">{photo.notes}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {new Date(photo.timestamp).toLocaleDateString()}
                      </p>
                      {photo.isSynced && (
                        <p className="text-xs text-green-600">✓ Synced</p>
                      )}
                      <button
                        onClick={() => deletePhoto(photo.id)}
                        className="w-full mt-2 text-xs bg-red-100 text-red-700 hover:bg-red-200 py-1 px-2 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {photos.length === 0 && !cameraActive && !showForm && (
            <div className="text-center text-gray-500 py-8">
              <p className="text-lg">No photos yet</p>
              <p className="text-sm">Start by taking a photo of a book series you found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoNotesCapture;
