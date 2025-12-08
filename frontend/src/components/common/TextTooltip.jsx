import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import './TextTooltip.css';

const TextTooltip = ({ text, maxLength = 30 }) => {
    if (!text || text.length <= maxLength) {
        return <span>{text}</span>;
    }

    const truncatedText = `${text.substring(0, maxLength)}...`;

    return (
        <Tooltip.Provider>
            <Tooltip.Root delayDuration={300}>
                <Tooltip.Trigger asChild>
                    <span style={{ cursor: 'help', borderBottom: '1px dotted #9ca3af' }}>
                        {truncatedText}
                    </span>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                    <Tooltip.Content className="TooltipContent" sideOffset={5}>
                        {text}
                        <Tooltip.Arrow className="TooltipArrow" />
                    </Tooltip.Content>
                </Tooltip.Portal>
            </Tooltip.Root>
        </Tooltip.Provider>
    );
};

export default TextTooltip;
