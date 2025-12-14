import { History, RefreshCw } from 'lucide-react';
import { useMovements } from '../hooks/useMovements';
import { getMovementTypeLabel, getMovementTypeBadge } from '../utils/movementHelpers';
import './Movements.css';

export default function Movements() {
  const { movements, refreshMovements, loading } = useMovements();

  return (
    <div className="movements-page">
      <div className="page-header">
        <div>
          <h1><History size={28} /> Hareket Geçmişi</h1>
          <p>Tüm stok hareketlerinin geçmişi</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={refreshMovements}
          disabled={loading}
        >
          <RefreshCw size={18} /> Yenile
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Tip</th>
                <th>Ürün</th>
                <th>Miktar</th>
                <th>Nereden</th>
                <th>Nereye</th>
                <th>Kullanıcı</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="spinner"></div>
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                    Henüz hareket kaydı yok
                  </td>
                </tr>
              ) : (
                movements.map(movement => (
                  <tr key={movement.id}>
                    <td>{new Date(movement.created_at).toLocaleString('tr-TR')}</td>
                    <td>
                      <span className={`badge ${getMovementTypeBadge(movement.movement_type)}`}>
                        {getMovementTypeLabel(movement.movement_type)}
                      </span>
                    </td>
                    <td>
                      <strong>{movement.item_code}</strong> - {movement.item_name}
                    </td>
                    <td><strong>{movement.quantity}</strong></td>
                    <td>{movement.from_location_code || '-'}</td>
                    <td>{movement.to_location_code || '-'}</td>
                    <td>{movement.full_name}</td>
                    <td>{movement.movement_note || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
