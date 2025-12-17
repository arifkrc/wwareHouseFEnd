import React, { useState } from 'react';

export default function ExpandableText({ text, limit = 50 }) {
    const [expanded, setExpanded] = useState(false);

    if (!text || text.length <= limit) return <span>{text}</span>;

    return (
        <div
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}
            title={expanded ? "Daralt" : "Genişlet"}
        >
            <span>
                {expanded ? text : `${text.substring(0, limit)}...`}
            </span>
            <small style={{ color: '#2563eb', marginLeft: '4px', fontSize: '0.7em', whiteSpace: 'nowrap' }}>
                {expanded ? '(daha az)' : '(daha fazla)'}
            </small>
        </div>
    );
}
