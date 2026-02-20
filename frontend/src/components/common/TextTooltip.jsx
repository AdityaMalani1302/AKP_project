import React, { memo } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import './TextTooltip.css';

/**
 * Enhanced TextTooltip with customizable positioning and rich content support
 * @param {string|React.ReactNode} text - Text to display (full content)
 * @param {number} maxLength - Max characters before truncation (default: 30)
 * @param {React.ReactNode} children - Optional custom trigger element
 * @param {'top'|'bottom'|'left'|'right'} side - Tooltip position (default: 'top')
 * @param {number} delayDuration - Hover delay in ms (default: 300)
 * @param {boolean} showUnderline - Show dotted underline hint (default: true)
 * @param {React.ReactNode} content - Optional custom tooltip content (overrides text)
 */
const TextTooltip = memo(({ 
    text, 
    maxLength = 30, 
    children,
    side = 'top',
    delayDuration = 300,
    showUnderline = true,
    content
}) => {
    const stringText = String(text ?? '');

    // If custom children provided and no truncation needed, use as-is
    if (children) {
        return (
            <Tooltip.Provider>
                <Tooltip.Root delayDuration={delayDuration}>
                    <Tooltip.Trigger asChild>
                        {children}
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                        <Tooltip.Content className="TooltipContent" side={side} sideOffset={5}>
                            {content || text}
                            <Tooltip.Arrow className="TooltipArrow" />
                        </Tooltip.Content>
                    </Tooltip.Portal>
                </Tooltip.Root>
            </Tooltip.Provider>
        );
    }

    // Standard text truncation mode
    if (!stringText || stringText.length <= maxLength) {
        return <span>{text}</span>;
    }

    const truncatedText = `${stringText.substring(0, maxLength)}...`;

    return (
        <Tooltip.Provider>
            <Tooltip.Root delayDuration={delayDuration}>
                <Tooltip.Trigger asChild>
                    <span 
                        style={{ 
                            cursor: 'help', 
                            borderBottom: showUnderline ? '1px dotted #9ca3af' : 'none' 
                        }}
                    >
                        {truncatedText}
                    </span>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                    <Tooltip.Content className="TooltipContent" side={side} sideOffset={5}>
                        {content || text}
                        <Tooltip.Arrow className="TooltipArrow" />
                    </Tooltip.Content>
                </Tooltip.Portal>
            </Tooltip.Root>
        </Tooltip.Provider>
    );
});

TextTooltip.displayName = 'TextTooltip';

export default TextTooltip;
