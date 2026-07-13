import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'used_qr_nonces' })
export class QrNonceEntity {
  @PrimaryColumn({ length: 36 })
  nonce!: string;

  @Column({ name: 'used_at', type: 'timestamptz' })
  usedAt!: Date;
}
