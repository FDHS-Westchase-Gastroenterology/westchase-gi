/* The provider profile-card graphic kept ON the page: a real thumbnail plus a
   same-page full-screen viewer with photo-app gestures. The card shows the
   thumbnail — the viewer is a native <dialog> that only opens on click. */

import { ProfileCardViewer, previewCardImage, previewDict } from "westchase-gi";

export function Default() {
  return (
    <div className="max-w-xs">
      <ProfileCardViewer
        image={previewCardImage}
        subject="Dr. John Chang"
        t={{ ...previewDict.physicians.card, close: previewDict.common.close }}
      />
    </div>
  );
}
