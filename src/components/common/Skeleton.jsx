import './Skeleton.scss';

export default function Skeleton({ width, height, borderRadius, style, className }) {
    const styles = {
        width,
        height,
        borderRadius,
        ...style
    };

    return <div className={`skeleton ${className || ''}`} style={styles} />;
}
