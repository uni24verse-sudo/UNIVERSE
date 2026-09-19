// Universal Share Helper for UniVerse Digital Campus Dining
export const showGlobalToast = (message, icon = '📋') => {
  window.dispatchEvent(
    new CustomEvent('universe_show_toast', {
      detail: { message, icon }
    })
  );
};

export const shareContent = async ({ title, text, url }) => {
  const shareUrl = url || window.location.href;
  const shareTitle = title || 'UniVerse - Digital Campus Dining';
  const shareText = text || 'Order food seamlessly on UniVerse!';

  // 1. Web Share API (Primary for mobile devices like Android Chrome / iOS Safari)
  if (navigator.share) {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl
      });
      return { success: true, method: 'native' };
    } catch (err) {
      if (err.name === 'AbortError') {
        // User cancelled share dialog
        return { success: false, method: 'cancelled' };
      }
      // If native sharing fails for any permission reason, fall through to clipboard
    }
  }

  // 2. Clipboard Fallback (Desktop / unsupported browsers)
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      showGlobalToast('Link copied to clipboard!', '📋');
      return { success: true, method: 'clipboard' };
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showGlobalToast('Link copied to clipboard!', '📋');
      return { success: true, method: 'clipboard' };
    }
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
    showGlobalToast('Failed to copy link', '⚠️');
    return { success: false, error: err };
  }
};
