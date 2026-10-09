import React, { useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

interface AlphabetPickerProps {
    readonly value?: string | null;
    readonly onChange: (value: string | null | undefined) => void;
}
const LETTER_VALUES = [
    '#',
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z'
];

/** Keep the native alphabet filter reachable without covering cinematic artwork. */
const AlphabetPicker: React.FC<AlphabetPickerProps> = ({ value, onChange }) => {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const open = useCallback((event: React.MouseEvent<HTMLElement>) => setAnchor(event.currentTarget), []);
    const close = useCallback(() => setAnchor(null), []);
    const handleValue = useCallback(
        (_event: React.MouseEvent<HTMLElement>, newValue: string | null | undefined) => {
            onChange(newValue);
            close();
        },
        [onChange, close]
    );
    return (
        <Box className='padded-left padded-right' sx={{ marginBottom: 2 }}>
            <Button
                variant='text'
                color='inherit'
                onClick={open}
                aria-haspopup='true'
                aria-expanded={Boolean(anchor)}
            >
                {value ? `A–Z · ${value}` : 'A–Z'}
            </Button>
            <Popover
                open={Boolean(anchor)}
                anchorEl={anchor}
                onClose={close}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <ToggleButtonGroup
                    value={value}
                    exclusive
                    color='primary'
                    onChange={handleValue}
                    aria-label='Filter titles by initial'
                    sx={{ display: 'flex', flexWrap: 'wrap', maxWidth: 300, padding: 1 }}
                >
                    {LETTER_VALUES.map((letter) => (
                        <ToggleButton
                            key={letter}
                            value={letter}
                            aria-label={`Titles starting with ${letter}`}
                            sx={{ minWidth: 44, minHeight: 44, border: 0 }}
                        >
                            {letter}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Popover>
        </Box>
    );
};
export default AlphabetPicker;
