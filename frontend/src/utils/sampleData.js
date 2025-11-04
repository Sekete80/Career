import { addDoc, collection } from 'firebase/firestore';
import { db } from '../services/api';

export const addSampleCourses = async () => {
  const sampleCourses = [
  ];

  try {
    for (const course of sampleCourses) {
      await addDoc(collection(db, 'courses'), course);
    }
    console.log('Sample courses added successfully!');
    return true;
  } catch (error) {
    console.error('Error adding sample courses:', error);
    return false;
  }
};