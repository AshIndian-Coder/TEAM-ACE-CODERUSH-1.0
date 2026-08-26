import type { Doctor } from '../../engine/domain/types';

export const DEMO_DOCTORS: Doctor[] = [
  // Manchar Primary
  { id: 'doc-01', name: 'Dr. Anjali Patil', specialty: 'General Surgeon', facilityId: 'h-n1', shiftStatus: 'on-duty' },
  { id: 'doc-02', name: 'Dr. Rohan Deshmukh', specialty: 'Pediatrician', facilityId: 'h-n1', shiftStatus: 'on-duty' },
  { id: 'doc-03', name: 'Dr. Sneha Kulkarni', specialty: 'Gynaecologist', facilityId: 'h-n1', shiftStatus: 'off-duty' },
  
  // Junnar District
  { id: 'doc-04', name: 'Dr. Vikram Singh', specialty: 'Cardiologist', facilityId: 'h-n2', shiftStatus: 'on-duty' },
  { id: 'doc-05', name: 'Dr. Priya Sharma', specialty: 'Orthopedic', facilityId: 'h-n2', shiftStatus: 'on-duty' },
  { id: 'doc-06', name: 'Dr. Amit Joshi', specialty: 'General Surgeon', facilityId: 'h-n2', shiftStatus: 'on-duty' },
  { id: 'doc-07', name: 'Dr. Neha Gupta', specialty: 'Trauma Specialist', facilityId: 'h-n2', shiftStatus: 'off-duty' },
  
  // Chakan Govt Medical
  { id: 'doc-08', name: 'Dr. Rajesh Kumar', specialty: 'Neurologist', facilityId: 'h-n3', shiftStatus: 'on-duty' },
  { id: 'doc-09', name: 'Dr. Pooja Mehta', specialty: 'Pulmonologist', facilityId: 'h-n3', shiftStatus: 'on-duty' },
  { id: 'doc-10', name: 'Dr. Suresh Reddy', specialty: 'General Surgeon', facilityId: 'h-n3', shiftStatus: 'off-duty' },
  
  // Ale Trauma
  { id: 'doc-11', name: 'Dr. Arjun Nair', specialty: 'Trauma Specialist', facilityId: 'h-n4', shiftStatus: 'on-duty' },
  { id: 'doc-12', name: 'Dr. Kavita Rao', specialty: 'Orthopedic', facilityId: 'h-n4', shiftStatus: 'on-duty' },
  { id: 'doc-13', name: 'Dr. Manish Verma', specialty: 'General Surgeon', facilityId: 'h-n4', shiftStatus: 'on-duty' },
  
  // Rajgurunagar Cardiac
  { id: 'doc-14', name: 'Dr. Sanjay Malhotra', specialty: 'Cardiologist', facilityId: 'h-n5', shiftStatus: 'on-duty' },
  { id: 'doc-15', name: 'Dr. Ananya Singh', specialty: 'Pulmonologist', facilityId: 'h-n5', shiftStatus: 'off-duty' },
  
  // Malshej Maternal
  { id: 'doc-16', name: 'Dr. Sunita Desai', specialty: 'Gynaecologist', facilityId: 'h-n6', shiftStatus: 'on-duty' },
  { id: 'doc-17', name: 'Dr. Ramesh Pawar', specialty: 'Pediatrician', facilityId: 'h-n6', shiftStatus: 'on-duty' },
  
  // Alandi Multi-Specialty
  { id: 'doc-18', name: 'Dr. Vivek Oberoi', specialty: 'Cardiologist', facilityId: 'h-n7', shiftStatus: 'on-duty' },
  { id: 'doc-19', name: 'Dr. Meera Iyer', specialty: 'Neurologist', facilityId: 'h-n7', shiftStatus: 'on-duty' },
  { id: 'doc-20', name: 'Dr. Karthik Subramanian', specialty: 'Orthopedic', facilityId: 'h-n7', shiftStatus: 'on-duty' },
  { id: 'doc-21', name: 'Dr. Lisa Fernandez', specialty: 'Pediatrician', facilityId: 'h-n7', shiftStatus: 'on-duty' },
  { id: 'doc-22', name: 'Dr. Ahmed Khan', specialty: 'General Surgeon', facilityId: 'h-n7', shiftStatus: 'on-duty' },
  { id: 'doc-23', name: 'Dr. Sarah Johnson', specialty: 'Pulmonologist', facilityId: 'h-n7', shiftStatus: 'off-duty' },
  { id: 'doc-24', name: 'Dr. Deepa Nair', specialty: 'Gynaecologist', facilityId: 'h-n7', shiftStatus: 'on-duty' },
  { id: 'doc-25', name: 'Dr. Rakesh Yadav', specialty: 'Trauma Specialist', facilityId: 'h-n7', shiftStatus: 'on-duty' },
  
  // Parner Emergency Hub
  { id: 'doc-26', name: 'Dr. Sameer Shaikh', specialty: 'Trauma Specialist', facilityId: 'h-n8', shiftStatus: 'on-duty' },
  { id: 'doc-27', name: 'Dr. Nidhi Agarwal', specialty: 'Cardiologist', facilityId: 'h-n8', shiftStatus: 'off-duty' },
  { id: 'doc-28', name: 'Dr. Prakash Mane', specialty: 'General Surgeon', facilityId: 'h-n8', shiftStatus: 'on-duty' },
];
