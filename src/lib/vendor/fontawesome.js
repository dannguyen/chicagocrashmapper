import { library, dom } from '@fortawesome/fontawesome-svg-core';
import { far } from '@fortawesome/free-regular-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';

// Add the icon packs to the library
library.add(far);

// Allow DOM auto-replacement
dom.watch();
