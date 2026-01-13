export const HARDWARE_PRESETS: Record<string, any> = {
    '8': {
        name: 'Beginner 8 Tines',
        tinesCount: 8,
        centerNoteIndex: 3.5, // Between 3 and 4
        defaultRoot: 'C4',
        layout: 'alternating',
        range: '1 octave'
    },
    '9': {
        name: '9 Tines',
        tinesCount: 9,
        centerNoteIndex: 4,
        defaultRoot: 'C4',
        layout: 'alternating'
    },
    '10': {
        name: '10 Tines',
        tinesCount: 10,
        centerNoteIndex: 4.5,
        defaultRoot: 'C4',
        layout: 'alternating'
    },

    '17': {
        name: 'Standard 17 Tines',
        tinesCount: 17,
        centerNoteIndex: 8,
        defaultRoot: 'C4',
        layout: 'alternating',
        range: '2 octaves + 2 notes'
    },
    '21': {
        name: 'Professional 21 Tines',
        tinesCount: 21,
        centerNoteIndex: 10,
        defaultRoot: 'F3',
        layout: 'alternating',
        description: 'Includes 4 extra low notes',
        scale: 'Major'
    },
    '34': {
        name: 'Chromatic 34 Tines (Seeds)',
        tinesCount: 34,
        centerNoteIndex: 10, // Center of bottom layer (21 keys) is index 10. 
        // Logic: 21 keys bottom, 13 top. 
        // 34-key usually has F3 as center of low row.
        defaultRoot: 'F3',
        isChromatic: true,
        structure: 'dual-layer',
        scale: 'Chromatic'
    }
};
